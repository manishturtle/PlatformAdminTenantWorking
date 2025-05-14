import { useState, useEffect } from 'react';
import yaml from 'js-yaml';

interface SubFeature {
  [key: string]: string;
}

interface Feature {
  label: string;
  description: string;
  subFeatures: SubFeature;
}

interface Application {
  name: string;
  description: string;
  features: {
    [key: string]: Feature;
  };
}

interface FeaturesData {
  applications: {
    [key: string]: Application;
  };
}

export interface FlattenedFeature {
  id: string;
  name: string;
  description: string;
  subFeatures: { id: string; name: string }[];
}

export function useFeatures() {
  const [features, setFeatures] = useState<FlattenedFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadFeatures = async () => {
      try {
        // In a real app, this would be an API call
        const response = await fetch('/api/features');
        const text = await response.text();
        const data = yaml.load(text) as FeaturesData;
        
        // Flatten the features structure
        const flattenedFeatures: FlattenedFeature[] = [];
        
        Object.entries(data.applications).forEach(([appKey, app]) => {
          Object.entries(app.features).forEach(([featureKey, feature]) => {
            flattenedFeatures.push({
              id: `${appKey}.${featureKey}`,
              name: feature.label,
              description: feature.description,
              subFeatures: Object.entries(feature.subFeatures).map(([subKey, subLabel]) => ({
                id: `${appKey}.${featureKey}.${subKey}`,
                name: subLabel
              }))
            });
          });
        });

        setFeatures(flattenedFeatures);
        setLoading(false);
      } catch (err) {
        setError('Failed to load features');
        setLoading(false);
      }
    };

    // For now, use dummy data
    const dummyFeatures: FlattenedFeature[] = [
      {
        id: 'crm.contact_management',
        name: 'Contact Management',
        description: 'Manage customer contacts and interactions',
        subFeatures: [
          { id: 'crm.contact_management.creation', name: 'Create and edit contacts' },
          { id: 'crm.contact_management.import', name: 'Import contacts from CSV/Excel' },
          { id: 'crm.contact_management.groups', name: 'Organize contacts into groups' }
        ]
      },
      {
        id: 'crm.lead_management',
        name: 'Lead Management',
        description: 'Track and manage sales leads',
        subFeatures: [
          { id: 'crm.lead_management.capture', name: 'Capture leads from multiple sources' },
          { id: 'crm.lead_management.scoring', name: 'Score leads based on engagement' },
          { id: 'crm.lead_management.nurturing', name: 'Automated lead nurturing workflows' }
        ]
      },
      {
        id: 'ai_platform.model_training',
        name: 'Model Training',
        description: 'Train and fine-tune AI models',
        subFeatures: [
          { id: 'ai_platform.model_training.data_prep', name: 'Prepare and clean training data' },
          { id: 'ai_platform.model_training.selection', name: 'Choose from various ML models' },
          { id: 'ai_platform.model_training.tuning', name: 'Optimize model parameters' }
        ]
      }
    ];

    setFeatures(dummyFeatures);
    setLoading(false);
  }, []);

  return { features, loading, error };
}
