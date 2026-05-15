/**
 * Transforms backend quotation data into AI-friendly format
 *
 * This module converts the raw database entity into a structured,
 * well-organized format optimized for AI understanding and cost estimation.
 */

export interface BackendQuotation {
  id: string;
  projectCode: string;
  projectName: string;
  formData: Record<string, any>;
  createdAt: string;
  createdBy?: {
    email: string;
    matricola?: string;
  };
}

export interface AIQuotationData {
  quotation_id: string;
  project_name: string;
  project_code: string;
  submitted_at: string;
  submitted_by: string;

  // Structured form data optimized for AI consumption
  form_data: {
    // Project basics
    project: {
      start_date: string;
      end_date: string;
      duration: string;
      budget_range: string;
      type: string; // New, Evolution, CIF
      risk_level: string;
    };

    // Architecture & Infrastructure
    architecture: {
      has_architectural_impact: boolean;
      deployment: {
        cloud_saas: boolean;
        cloud_iaas_paas: boolean;
        host_mainframe: boolean;
        on_premise: boolean;
      };
      needs_new_infrastructure: boolean;
      infrastructure_type: {
        vm_based: boolean;
        microservices: boolean;
      };
    };

    // Service characteristics
    service: {
      impact_entity: string;
      consumer: string;
      volumes_per_day: number;
      technological_impact: string;
      exposure: boolean;
      market_product: boolean;
      saas_product: boolean;
      monitoring_security_tool: boolean;
    };

    // Development
    development: {
      internal: boolean;
      external_vendors: boolean;
      has_ca_ip: boolean;
      dependencies_external: boolean;
      integrations_internal: boolean;
      expected_releases: number;
    };

    // Pipeline & DevOps
    devops: {
      pipeline_complexity: string;
      microservices_count: number;
      monitoring_systems: string;
      observability: string;
    };

    // Database
    database: {
      has_dip_impact: boolean;
      has_sql_db: boolean;
      dedicated_sql_cluster: boolean;
      has_postgres_db: boolean;
      has_mongo_db: boolean;
      has_host_db2_impact: boolean;
    };

    // Resources
    resources: {
      storage_gb: number;
      compute_cores: number;
      scheduled_batches: number;
    };

    // Testing & QA
    testing: {
      qa_required: string;
      // test_magnitude removed - application testing is out of CTO scope
    };
  };
}

/**
 * Transform backend quotation into AI-optimized format
 */
export function transformQuotationForAI(backendQuotation: BackendQuotation): AIQuotationData {
  const fd = backendQuotation.formData;

  return {
    quotation_id: backendQuotation.id,
    project_name: backendQuotation.projectName,
    project_code: backendQuotation.projectCode,
    submitted_at: backendQuotation.createdAt,
    submitted_by: backendQuotation.createdBy?.email || 'unknown',

    form_data: {
      project: {
        start_date: fd.projectStartDate,
        end_date: fd.projectEndDate,
        duration: fd.projectDuration,
        budget_range: fd.projectBudget,
        type: fd.projectType,
        risk_level: fd.serviceRisk,
      },

      architecture: {
        has_architectural_impact: fd.architecturalImpact === 'YES',
        deployment: {
          cloud_saas: fd.cloudSaas === true,
          cloud_iaas_paas: fd.cloudIaasPaasLandingZoneCa === true,
          host_mainframe: fd.hostMainframe === true,
          on_premise: fd.onPremiseDipartimentale === true,
        },
        needs_new_infrastructure: fd.needNewInfrastructure === true,
        infrastructure_type: {
          vm_based: fd.infraOnVm === true,
          microservices: fd.infraMicroservices === true,
        },
      },

      service: {
        impact_entity: fd.impactEntity,
        consumer: fd.serviceConsumer,
        volumes_per_day: fd.serviceVolumesPerDay,
        technological_impact: fd.technologicalImpact,
        exposure: fd.serviceExposure === true,
        market_product: fd.marketProduct === true,
        saas_product: fd.saasProduct === true,
        monitoring_security_tool: fd.monitoringOrSecurityTool === true,
      },

      development: {
        internal: fd.developedInternally === true,
        external_vendors: fd.developedByExternalVendors === true,
        has_ca_ip: fd.hasCaIntellectualProperty === true,
        dependencies_external: fd.dependenciesWithExternalServices === true,
        integrations_internal: fd.integrationsWithInternalSystems === true,
        expected_releases: fd.expectedReleases,
      },

      devops: {
        pipeline_complexity: fd.pipeline,
        microservices_count: fd.microservicesCount,
        monitoring_systems: fd.monitoringSystems,
        observability: fd.observability,
      },

      database: {
        has_dip_impact: fd.hasDatabaseImpactDip === true,
        has_sql_db: fd.hasSqlDbType === true,
        dedicated_sql_cluster: fd.dedicatedSqlCluster === true,
        has_postgres_db: fd.hasPostgresDatabase === true,
        has_mongo_db: fd.hasMongoDatabase === true,
        has_host_db2_impact: fd.hasDatabaseImpactHostDb2 === true,
      },

      resources: {
        storage_gb: fd.storageGb,
        compute_cores: fd.computeCores,
        scheduled_batches: fd.scheduledBatches,
      },

      testing: {
        qa_required: fd.qa,
        // testMagnitude removed - application testing is out of CTO scope
      },
    },
  };
}
