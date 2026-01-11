import { Request, Response, NextFunction } from "express";
import { GetHealthStatus } from "../../../application/usecases/GetHealthStatus";

const getHealth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const usecase = new GetHealthStatus();
    const status = await usecase.execute();
    res.json({ status });
  } catch (err) {
    next(err);
  }
};

export default { getHealth };
