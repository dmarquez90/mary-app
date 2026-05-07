import { useState } from 'react'
import Login from './Login'
import ForgotPassword from './ForgotPassword'
import VerifyOTP from './VerifyOTP'
import ResetPassword from './ResetPassword'

export default function AuthRouter() {
  const [screen, setScreen] = useState('login')
  const [otpEmail, setOtpEmail] = useState('')

  const navigate = (target, params = {}) => {
    if (params.email) setOtpEmail(params.email)
    setScreen(target)
  }

  switch (screen) {
    case 'forgot-password':
      return <ForgotPassword onNavigate={navigate} />

    case 'verify-otp':
      return <VerifyOTP email={otpEmail} onNavigate={navigate} />

    case 'reset-password':
      return <ResetPassword onNavigate={navigate} />

    case 'login':
    default:
      return <Login onNavigate={navigate} />
  }
}
