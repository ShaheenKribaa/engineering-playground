import { AppHeader } from '@/components/playground/app-header'
import { CourseSidebar } from '@/components/playground/course-sidebar'
import { ShellProvider } from '@/components/playground/shell-context'

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return (
    <ShellProvider>
      <div className="flex min-h-dvh flex-col xl:h-dvh xl:overflow-hidden">
        <AppHeader />
        <div className="flex min-h-0 flex-1 gap-3 px-3 pb-3">
          <CourseSidebar />
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </ShellProvider>
  )
}
