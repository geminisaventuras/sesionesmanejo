// Feature flags para control de despliegue sin redeploy
export const FEATURE_FLAGS = {
  INSTRUCTOR_PANEL_V2: import.meta.env.VITE_INSTRUCTOR_PANEL_V2 !== 'false'
};
