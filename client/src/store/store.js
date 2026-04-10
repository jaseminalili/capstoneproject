import { configureStore } from '@reduxjs/toolkit'
import auth      from './slices/authSlice'
import workspace from './slices/workspaceSlice'
import projects  from './slices/projectSlice'
import tasks     from './slices/taskSlice'
import team      from './slices/teamSlice'
import notifications from './slices/notificationSlice'

// Re-export actions to maintain backward compatibility for existing components
export * from './slices/authSlice'
export * from './slices/workspaceSlice'
export * from './slices/projectSlice'
export * from './slices/taskSlice'
export * from './slices/teamSlice'
export * from './slices/notificationSlice'

export default configureStore({
  reducer: {
    auth,
    workspace,
    projects,
    tasks,
    team,
    notifications,
  },
})
