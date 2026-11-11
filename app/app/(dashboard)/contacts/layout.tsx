import { PageLayoutScope } from '@/components/providers/PageLayoutProvider'

export default function ContactsLayout({ children }: { children: React.ReactNode }) {
  // Em telas curtas, a página pode rolar além da altura disponível.
  return (
    <PageLayoutScope
      value={{
        width: 'content',
        padded: true,
        overflow: 'auto',
        height: 'full',
        showAccountAlerts: true,
      }}
    >
      {children}
    </PageLayoutScope>
  )
}
