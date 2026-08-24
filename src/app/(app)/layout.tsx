import WebLayout from '@/components/WebLayout'
import InstallPWA from '@/components/InstallPWA'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <WebLayout>
      {children}
      <InstallPWA/>
    </WebLayout>
  )
}