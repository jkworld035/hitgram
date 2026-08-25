import WebLayout from '@/components/WebLayout'
import InstallPWA from '@/components/InstallPWA'
import StepWidget from '@/components/StepWidget'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <WebLayout>
      {children}
      <InstallPWA/>
      <StepWidget/>
    </WebLayout>
  )
}