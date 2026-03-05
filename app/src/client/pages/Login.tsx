import { routes } from 'wasp/client/router'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const navigate = useNavigate()

  const handleFakeLogin = () => {
    // For now this can just redirect to profile;
    // real auth is already built into OpenSaaS template.
    navigate(routes.ProfileRoute.to)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
      <h1 className="text-2xl font-semibold">Login</h1>
      <p className="text-gray-600 text-sm">Prototype login page</p>
      <button
        onClick={handleFakeLogin}
        className="px-6 py-2 rounded-md border text-sm font-medium"
      >
        Continue to Profile
      </button>
    </div>
  )
}
