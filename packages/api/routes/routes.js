import healthCheckRoutes from "./healthRoutes.js";
import bookRoutes from "./bookRoutes.js";
import readingSessionRoutes from "./readingSessionRoutes.js";
import authorRoutes from "./authorRoutes.js";
import countryRoutes from "./countryRoutes.js";

const routes = [
  healthCheckRoutes,
  bookRoutes,
  readingSessionRoutes,
  authorRoutes,
  countryRoutes
];

export default routes;