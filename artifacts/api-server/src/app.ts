import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { auditIpMiddleware } from "./middlewares/audit-middleware";
import { errorHandler, notFoundHandler } from "./middlewares/error-handler";
import { config } from "./lib/config";

const app: Express = express();

// Trust proxy headers (required for correct IP extraction behind load balancer)
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors({
  origin: config.CORS_ORIGINS === "*" ? "*" : config.CORS_ORIGINS.split(","),
  credentials: true,
}));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Attach IP extractor for audit logging
app.use(auditIpMiddleware);

app.use("/api", router);

// 404 and global error handler — must be last
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
