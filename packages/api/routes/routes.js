import healthCheckRoutes from "./healthRoutes.js";
import bookRoutes from "./bookRoutes.js";
import readingSessionRoutes from "./readingSessionRoutes.js";
import authorRoutes from "./authorRoutes.js";
import countryRoutes from "./countryRoutes.js";
import bookTypesRoutes from "./bookTypesRoutes.js";
import genreRoutes from "./genreRoutes.js";
import kpiRoutes from "./kpiRoutes.js";
import aiRoutes from "./aiRoutes.js";

const routes = [
  healthCheckRoutes,
  bookRoutes,
  readingSessionRoutes,
  authorRoutes,
  countryRoutes,
  bookTypesRoutes,
  genreRoutes,
  kpiRoutes,
  aiRoutes,
];

export default routes;
