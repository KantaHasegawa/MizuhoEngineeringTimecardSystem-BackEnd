import express from 'express';
const router = express.Router();
import documentClient from "../../dbconnect";
import userRoute from './userRouter'
import authRoute from './authRouter'
import workspotRoute from './workspotRouter'
import timecardRoute from './timecardRouter'

router.get("/api/v1/", (req: express.Request, res: express.Response) => {
  const env: string = process.env.NODE_ENV ?? "development"
  res.json({ message: `env is ${env}` });
});

router.get("/api/v1/records", (req: express.Request, res: express.Response) => {
  documentClient
    .scan({
      TableName: "Timecards",
    })
    .promise()
    .then((result) => res.json(result))
    .catch((e) => res.status(422).json({ errors: e }))});

router.use('/api/v1/user', userRoute );
router.use('/api/v1/auth', authRoute);
router.use('/api/v1/workspot', workspotRoute);
router.use('/api/v1/timecard', timecardRoute);

export default router;
