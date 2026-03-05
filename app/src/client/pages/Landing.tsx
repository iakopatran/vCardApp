import { routes } from 'wasp/client/router'
import { useAuth } from 'wasp/client/auth'
import { useNavigate } from 'react-router-dom'

export default function Landing() {
  const { data: user } = useAuth()
  const navigate = useNavigate()

  const handleCreateCardClick = () => {
    if (user) {
      navigate(routes.CreateContactRoute.to)
    } else {
      navigate(routes.LoginRoute.to)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
      <h1 className="text-3xl font-semibold">
        Welcome to Business Card Intake
      </h1>
      <p className="text-gray-600">
        Turn a card into a digital contact in seconds.
      </p>
      <button
        onClick={handleCreateCardClick}
        className="px-6 py-2 rounded-md border text-sm font-medium"
      >
        Create Card
      </button>
    </div>
  )
}
