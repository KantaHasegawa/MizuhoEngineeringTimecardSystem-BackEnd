import express from 'express';
import { check, validationResult } from 'express-validator';
import documentClient from "../dbconnect";
import dayjs from "dayjs";
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import "dayjs/locale/ja"
dayjs.locale("ja")
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const isValidTime = (time: string): Boolean => {
  const year = Number(time.slice(0, 4))
  const month = Number(time.slice(4, 6))
  const day = Number(time.slice(6, 8))
  const hour = Number(time.slice(8, 10))
  const minute = Number(time.slice(10, 12))
  const second = Number(time.slice(12, 14))
  if (!Number(time)) {
    return false
  } else if (!(2021 <= year && year <= 2100)
    || !(1 <= month && month <= 12)
    || !(1 <= day && day <= 31)
    || !(0 <= hour && hour <= 24)
    || !(0 <= minute && minute <= 60)
    || !(0 <= second && second <= 60))
  {
    return false
  } else {
    return true
  }
}

export const adminNewTimecardValidation = [
  check("user").not().isEmpty().matches("^[ぁ-んァ-ヶｱ-ﾝﾞﾟ一-龠]*$"),
  check("attendance").not().isEmpty().isNumeric().custom((value) => {
    if (isValidTime(value)) throw new Error("無効な時間です")
  }),
  check("leave").custom((value, { req }) => {
    const dayjsObjLeave = dayjs(value)
    const dayjsObjAttendance = dayjs(req.body.attendance)
    if (value) {
      if (isValidTime(value)) throw new Error("無効な時間です")
      if (dayjsObjLeave.isSameOrBefore(dayjsObjAttendance)) throw new Error("無効な退勤時間です")
      return true
    } else {
      return true
    }
  }),
  check("workspot").not().isEmpty().custom((value) => {
    const params = {
      TableName: 'Timecards',
      ExpressionAttributeNames: { '#u': 'user', '#w': 'workspot' },
      ExpressionAttributeValues: { ':uval': 'workspot', ':wval': value },
      KeyConditionExpression: '#u = :uval',
      FilterExpression: '#w = :wval'
    };
    return documentClient.query(params).promise().then((results: any) => {
      if (!Object.keys(results.Items).length) throw new Error('登録されていない勤務地です')
      return true
    })
  }),
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    else next();
  }
]