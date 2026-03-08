/**
 * Environment Configuration
 * 
 * Centralized configuration for different environments (development, testing, production)
 */

export interface EnvironmentConfig {
  nodeEnv: 'development' | 'testing' | 'production';
  
  // Server
  server: {
    port: number;
  };
  
  // Database
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    ssl: boolean;
  };
  
  // AWS
  aws: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    s3: {
      listingsBucket: string;
      audioBucket: string;
      cropDiagnosisBucket: string;
      useS3ForListings: boolean;
    };
    lex: {
      botId: string;
      botAliasId: string;
      region: string;
    };
  };
  
  // Local services
  redis: {
    host: string;
    port: number;
  };
  
  mongodb: {
    uri: string;
  };
}

export function getEnvironmentConfig(): EnvironmentConfig {
  return {
    nodeEnv: (process.env.NODE_ENV as any) || 'development',
    
    server: {
      port: parseInt(process.env.PORT || '3000'),
    },
    
    database: {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      name: process.env.POSTGRES_DB || 'bharat_mandi',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || '',
      ssl: process.env.DB_SSL === 'true',
    },
    
    aws: {
      region: process.env.AWS_REGION || 'ap-southeast-2',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      s3: {
        listingsBucket: process.env.S3_LISTINGS_BUCKET || 'bharat-mandi-listings-testing',
        audioBucket: process.env.S3_AUDIO_BUCKET || 'bharat-mandi-voice-ap-south-1',
        cropDiagnosisBucket: process.env.S3_CROP_DIAGNOSIS_BUCKET || 'bharat-mandi-crop-diagnosis',
        useS3ForListings: process.env.USE_S3_FOR_LISTINGS === 'true',
      },
      lex: {
        botId: process.env.LEX_BOT_ID || '',
        botAliasId: process.env.LEX_BOT_ALIAS_ID || '',
        region: process.env.LEX_REGION || 'ap-southeast-2',
      },
    },
    
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    },
    
    mongodb: {
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/bharat_mandi',
    },
  };
}

/**
 * Validate configuration on startup
 * Throws error if required configuration is missing
 */
export function validateConfig(config: EnvironmentConfig): void {
  const errors: string[] = [];
  
  // Database password required for non-development environments
  if (!config.database.password && config.nodeEnv !== 'development') {
    errors.push('Database password is required for non-development environments');
  }
  
  // S3 bucket required when S3 is enabled
  if (config.aws.s3.useS3ForListings && !config.aws.s3.listingsBucket) {
    errors.push('S3 listings bucket is required when USE_S3_FOR_LISTINGS is true');
  }
  
  // AWS credentials required when S3 is enabled
  if (config.aws.s3.useS3ForListings && (!config.aws.accessKeyId || !config.aws.secretAccessKey)) {
    errors.push('AWS credentials are required when USE_S3_FOR_LISTINGS is true');
  }
  
  // Lex configuration required
  if (!config.aws.lex.botId || !config.aws.lex.botAliasId) {
    console.warn('Warning: Lex bot ID and alias ID are not configured. Kisan Mitra chatbot will not work.');
  }
  
  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

// Export singleton instance
export const environmentConfig = getEnvironmentConfig();
