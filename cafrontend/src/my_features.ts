import axios from 'axios';

interface Feature {
  key: string;
  name: string;
  description?: string;
}

interface Module {
  key: string;
  name: string;
  description?: string;
  features: Feature[];
}

interface SubscriptionPlan {
  modules: Module[];
}

interface CheckAccessResponse {
  hasAccess: boolean;
  message?: string;
}

// Function to check access for a specific module or feature
async function checkAccess(moduleKey: string, featureKey?: string): Promise<CheckAccessResponse> {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      return { hasAccess: false, message: 'No authentication token found' };
    }

    const response = await axios.post(
      'http://localhost:8020/api/subscription/plan/',
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = response.data;
    if (!data.subscription_plan || !Array.isArray(data.subscription_plan.modules)) {
      return { hasAccess: false, message: 'Invalid subscription data' };
    }

    const plan: SubscriptionPlan = {
      modules: data.subscription_plan.modules,
    };

    // Find the module
    const module = plan.modules.find((m) => m.key === moduleKey);
    if (!module) {
      return { hasAccess: false, message: "You don't have access to this module" };
    }

    // If no specific feature is requested, module access is sufficient
    if (!featureKey) {
      return { hasAccess: true };
    }

    // Check feature access
    const hasFeatureAccess = module.features.some((f) => f.key === featureKey);
    return {
      hasAccess: hasFeatureAccess,
      message: hasFeatureAccess ? undefined : "You don't have access to this feature",
    };
  } catch (error) {
    console.error('Error checking feature access:', error);
    return {
      hasAccess: false,
      message: 'Error checking access permissions',
    };
  }
}

// Wrapper function to check module access
async function checkModuleAccess(moduleKey: string): Promise<CheckAccessResponse> {
  return checkAccess(moduleKey);
}

// Wrapper function to check feature access
async function checkFeatureAccess(moduleKey: string, featureKey: string): Promise<CheckAccessResponse> {
  return checkAccess(moduleKey, featureKey);
}

// Function to get all available modules
async function getAllModules() {
  try {
    const response = await fetch('http://localhost:8020/api/subscription/plan/',{
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
    });
    const data = await response.json();
    console.log('API Response:', data); // Debug log
    return {
      success: true,
      modules: data.subscription_plan.modules.map((module: any) => ({
        id: module.id, // Keep the numeric ID
        key: module.key,
        name: module.name || module.key, // Use provided name or key as fallback
        features: module.features
      }))
    };
  } catch (error) {
    console.error('Error fetching modules:', error);
    return {
      success: false,
      error: 'Error fetching modules',
      modules: []
    };
  }
}

export {
  checkModuleAccess,
  checkFeatureAccess,
  getAllModules,
  type CheckAccessResponse,
};
