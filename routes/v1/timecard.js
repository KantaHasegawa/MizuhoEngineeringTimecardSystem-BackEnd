const express = require('express');
const router = express.Router();
const helper = require("../../helper")
const { GeoPosition } = require('geo-position.ts');
const documentClient = require("../../dbconnect")
const dayjs = require("dayjs")
require("dayjs/locale/ja")
dayjs.locale("ja")

const checkUserLocation = async (req, res, next) => {
  const username = req.user.name;
  const params = {
    TableName: 'Timecards',
    ExpressionAttributeNames: { '#u': 'user', '#a': 'attendance' },
    ExpressionAttributeValues: { ':uval': username, ':aval': "relation" },
    KeyConditionExpression: '#u = :uval AND begins_with(#a, :aval)'
  }
  try {
    const result = await documentClient.query(params).promise();
    const workspots = result.Items;
    const userLocation = new GeoPosition(req.body.lat, req.body.lon)
    const distanceArray = []
    const distanceNameArray = []
    for (let workspot of workspots) {
      let workspotLocation = new GeoPosition(workspot.latitude, workspot.longitude);
      let result = +userLocation.Distance(workspotLocation).toFixed(0);
      distanceArray.push(result);
      distanceNameArray.push(workspot.workspot)
    }
    const minDistance = Math.min.apply(null, distanceArray)
    if (minDistance >= 1000) {
      throw new Error("指定された勤務地の半径1km以内に移動してください");
    } else {
      const distanceIndex = distanceArray.indexOf(minDistance);
      const userLocation = distanceNameArray[distanceIndex];
      req.userLocation = userLocation
      next();
    }
  } catch (e) {
    res.status(501).json(e.message)
  }
}

router.get("/index/:username", (req, res) => {
  const params = {
    TableName: 'Timecards',
    ExpressionAttributeNames: { '#u': 'user', '#a': 'attendance' },
    ExpressionAttributeValues: { ':userval': req.params.username, ':attendanceval': "2" },
    KeyConditionExpression: '#u = :userval AND begins_with(#a, :attendanceval)',
  };
  documentClient.query(params).promise()
    .then((result) => { res.json(result.Items) })
    .catch((e) => res.status(500).json({ errors: e }));
})

router.get("/check/:username", async (req, res) => {
  const params = {
    TableName: 'Timecards',
    ExpressionAttributeNames: { '#u': 'user', '#a': 'attendance' },
    ExpressionAttributeValues: { ':userval': req.params.username, ':attendanceval': "2" },
    KeyConditionExpression: '#u = :userval AND begins_with(#a, :attendanceval)',
  };
  documentClient.query(params).promise()
    .then((result) => { res.json(result.Items[result.Items.length - 1]) })
    .catch((e) => res.status(500).json({ errors: e }));
})

router.post("/common", helper.authenticateToken, checkUserLocation, (req, res) => {
  let params = {
    TableName: 'Timecards',
    ExpressionAttributeNames: { '#u': 'user', '#a': 'attendance' },
    ExpressionAttributeValues: { ':userval': req.user.name, ':attendanceval': "2" },
    KeyConditionExpression: '#u = :userval AND begins_with(#a, :attendanceval)',
  };
  documentClient.query(params).promise()
    .then((result) => {
      const latestRecord = result.Items[result.Items.length - 1]
      if (!latestRecord || latestRecord.leave !== "none") {
        let params = {
          user: req.user.name,
          attendance: dayjs().format('YYYYMMDDHHmmss'),
          workspot: req.userLocation,
          leave: "none"
        };
        documentClient
          .put({
            TableName: "Timecards",
            Item: params,
          })
          .promise()
          .then((result) => res.json({ "message": "insert success" }))
          .catch((e) => res.status(500).json({ errors: e }));
      } else {
        let params = {
          TableName: "Timecards",
          Key:{
            user: req.user.name,
            attendance: latestRecord.attendance
          },
          ExpressionAttributeNames: { '#l': 'leave' },
          ExpressionAttributeValues: { ':val': dayjs().format('YYYYMMDDHHmmss') },
          UpdateExpression: 'SET #l = :val'
        }
        documentClient.update(params).promise()
          .then((result) => res.json({ "message": "update success" }))
          .catch((e) => res.status(500).json({ errors: e }));
      }
    })
})

router.post("/admin/new", helper.authenticateToken, helper.adminUserCheck, (req, res) => {
  const params = {
    user: req.body.user,
    attendance: req.body.attendance,
    workspot: "debug spot",
    leave: req.body.leave || "none"
  };
  documentClient
    .put({
      TableName: "Timecards",
      Item: params,
    })
    .promise()
    .then((result) => res.json({ "message": "insert success" }))
    .catch((e) => res.status(500).json({ errors: e }));
})

router.delete("/admin/delete", helper.authenticateToken, helper.adminUserCheck,(req, res) => {
  const params = {
    TableName: 'Timecards',
    Key: {
      user: req.body.user,
      attendance: req.body.attendance
    }
  };
  documentClient.delete(params).promise()
    .then((result) => res.json({ message: "delete success" }))
    .catch((e) => res.status(500).json({ errors: e }));
})

module.exports = router;
