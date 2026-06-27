import AssetForm from './components/AssetForm'

function App() {
  return (
    <div className="min-h-screen bg-gray-100 py-10">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900">AR Headless CMS</h1>
        <p className="text-gray-500 mt-2">Content management panel</p>
      </header>
      
      <main>
        <AssetForm />
      </main>
    </div>
  )
}

export default App