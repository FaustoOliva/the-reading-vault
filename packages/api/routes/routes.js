import healthCheckRoutes from "./healthRoutes.js";
import bookRoutes from "./bookRoutes.js";
import readingSessionRoutes from "./readingSessionRoutes.js";
import authorRoutes from "./authorRoutes.js";
import countryRoutes from "./countryRoutes.js";
import kpiRoutes from "./kpiRoutes.js";

const routes = [
  healthCheckRoutes,
  bookRoutes,
  readingSessionRoutes,
  authorRoutes,
  countryRoutes,
  kpiRoutes
];

export default routes;