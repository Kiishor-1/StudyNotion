import { useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"

function Error() {
  const navigate = useNavigate()
  const { token } = useSelector((state) => state.auth)

  return (
    <div className="flex flex-1 flex-col justify-center items-center text-white px-4 text-center">
      <h1 className="text-4xl font-bold mb-4">Error 404 - Page Not Found</h1>

      {!token ? (
        <>
          <p className="text-lg mb-6 text-richblack-200">
            You may be trying to access a protected page.
            Please login to continue.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="px-6 py-2 bg-yellow-400 text-black font-semibold rounded-lg hover:bg-yellow-300 transition-all"
          >
            Go to Login
          </button>
        </>
      ) : (
        <p className="text-lg text-richblack-200">
          The page you are looking for doesn’t exist.
        </p>
      )}
    </div>
  )
}

export default Error