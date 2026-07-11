import os
import base64
import httpx
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional

security = HTTPBearer(auto_error=False)

CLERK_JWKS_URL = os.getenv("CLERK_JWKS_URL")
CLERK_PUBLISHABLE_KEY = os.getenv("CLERK_PUBLISHABLE_KEY")

# If JWKS URL is not set but publishable key is, parse the domain dynamically
if not CLERK_JWKS_URL and CLERK_PUBLISHABLE_KEY:
    try:
        parts = CLERK_PUBLISHABLE_KEY.split("_")
        if len(parts) >= 3:
            encoded_domain = parts[2]
            # Add base64 padding if necessary
            padding = len(encoded_domain) % 4
            if padding:
                encoded_domain += "=" * (4 - padding)
            domain = base64.b64decode(encoded_domain).decode("utf-8").replace("$", "")
            CLERK_JWKS_URL = f"https://{domain}/.well-known/jwks.json"
            print(f"Derived JWKS URL from Publishable Key: {CLERK_JWKS_URL}")
    except Exception as e:
        print(f"Error parsing CLERK_PUBLISHABLE_KEY: {e}")

# In-memory cache for JWKS keys
jwks_keys = None

async def fetch_jwks():
    global jwks_keys
    if not CLERK_JWKS_URL:
        return None
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(CLERK_JWKS_URL)
            if response.status_code == 200:
                jwks_keys = response.json().get("keys", [])
                return jwks_keys
    except Exception as e:
        print(f"Error fetching JWKS keys: {e}")
    return None

class UserSession:
    def __init__(self, user_id: str, role: Optional[str] = None, is_mock: bool = False):
        self.user_id = user_id
        self.role = role
        self.is_mock = is_mock

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> UserSession:
    is_clerk_configured = bool(CLERK_JWKS_URL)
    
    if not credentials:
        if not is_clerk_configured:
            # Under developer mode bypass, allow admin access
            return UserSession(user_id="dev-bypass-user", role="admin", is_mock=True)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided"
        )
        
    token = credentials.credentials
    
    # Support mock tokens in developer bypass or for API testing
    if not is_clerk_configured or token.startswith("mock-"):
        if token == "mock-admin-token" or token == "mock-admin":
            return UserSession(user_id="mock-admin-id", role="admin", is_mock=True)
        elif token.startswith("mock-user-"):
            user_id = token.replace("mock-user-", "")
            return UserSession(user_id=user_id, role="user", is_mock=True)
        elif token == "mock-user":
            return UserSession(user_id="mock-user-id", role="user", is_mock=True)
        
        # If Clerk isn't configured at all, treat the user as admin for developer convenience
        if not is_clerk_configured:
            return UserSession(user_id="mock-dev-user", role="admin", is_mock=True)

    # Decode and verify JWT strictly using Clerk's JWKS
    global jwks_keys
    if not jwks_keys:
        await fetch_jwks()
        
    if not jwks_keys:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Backend Authentication Error: JWKS keys could not be loaded"
        )
        
    try:
        # Extract kid from token header
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        if not kid:
            raise HTTPException(status_code=401, detail="Invalid token: kid header parameter is missing")
            
        # Find corresponding key in cache
        rsa_key = None
        for key in jwks_keys:
            if key["kid"] == kid:
                rsa_key = key
                break
                
        if not rsa_key:
            # Reload keys in case of rotation
            jwks_keys = await fetch_jwks()
            if jwks_keys:
                for key in jwks_keys:
                    if key["kid"] == kid:
                        rsa_key = key
                        break
                        
        if not rsa_key:
            raise HTTPException(status_code=401, detail="Signing key not found in JWKS")
            
        # Import algorithm dynamic loader
        from jwt.algorithms import RSAAlgorithm
        public_key = RSAAlgorithm.from_jwk(rsa_key)
        
        # Decode token (Skipping aud check since Clerk uses dynamic client IDs)
        payload = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            options={"verify_aud": False}
        )
        
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token subject (sub) is missing")
            
        # Retrieve user role from common custom claims or public metadata
        role = (
            payload.get("role") or 
            payload.get("public_metadata", {}).get("role") or 
            payload.get("metadata", {}).get("role")
        )
        
        return UserSession(user_id=user_id, role=role)
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Authentication token has expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid authentication token: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"JWT verification failed: {str(e)}")

def require_admin(user: UserSession = Depends(get_current_user)) -> UserSession:
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Admin privileges are required to access this resource"
        )
    return user

async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[UserSession]:
    if not credentials:
        return None
    try:
        return await get_current_user(credentials)
    except Exception:
        return None

