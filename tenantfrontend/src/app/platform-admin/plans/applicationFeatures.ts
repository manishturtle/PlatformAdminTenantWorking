export const applicationFeatures = {
  'app1': {
    name: 'Application 1',
    features: {
      userManagement: {
        label: 'User Management',
        subFeatures: {
          userRoles: 'User Roles',
          userGroups: 'User Groups'
        }
      },
      analytics: {
        label: 'Analytics',
        subFeatures: {
          basicReports: 'Basic Reports',
          advancedAnalytics: 'Advanced Analytics'
        }
      }
    }
  },
  'app2': {
    name: 'Application 2',
    features: {
      documentManagement: {
        label: 'Document Management',
        subFeatures: {
          fileSharing: 'File Sharing',
          versionControl: 'Version Control'
        }
      },
      collaboration: {
        label: 'Collaboration',
        subFeatures: {
          teamChat: 'Team Chat',
          taskManagement: 'Task Management'
        }
      }
    }
  }
};
