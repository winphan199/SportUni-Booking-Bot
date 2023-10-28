# SPORTUNI BOOKING BOT

sportuni booking bot is a script to automate the booking process for the desire courts at specific date, time and location.

## Installation

```bash
git clone https://github.com/winphan199/SportUni-Booking-Bot
cd SportUni-Booking-Bot
npm install
```

## Execution

```bash
npm start
```

## How to use

Script has 2 objects at the beginning of the file named `autobook.js`.

### generalInfo

`generalInfo` object is used to specify the range of booking dates, maximum court numbers,...

It is used to store the info so that the tool runs correctly.

```js
const generalInfo = {
  maxCourt: 3,
  cookie: "",
  startDate: "2023-11-03", // yyyy-mm-dd
  endDate: "2023-11-03", // yyyy-mm-dd
  sportUniLocation: {
    hervanta: true,
    center: true,
    kauppi: false,
    otherLocations: false,
  },
};
```

- `maxCourt`: Specify the maximum courts to be booked for a week. (usually 3)
- `cookie`: Credentials of the user used to book the court (read `howtogetcookie.pdf`)
- `startDate`: The starting date of the desire courts.
- `endDate`: The ending date of the desire courts.
- `sportUniLocation`: The desire location.

**TIP: the range of the startDate and endDate should be as narrow as possible and only turn the desire location to `true` to optimize the booking time.**

### Location Constant

Use to specify the desire location that contains the courts to be booked.

For example: `location.HERVANTA`, `location.CITY_CENTER`.

### toBookList

This is the list of booking requests that the user wants to perform.

The list contains multiple objects that represent the request.

```js
const toBookList = [
  {
    location: Location.HERVANTA,
    bookingRequests: [
      // Manage dựa trên requests nếu book đc conditionCourts thì process trueCourts
      // Nếu conditionCourts không khả thi thì move to new request. Miễn sao chưa đủ 3 courts là đc
      // Maximum court cho 1 request là 3.
      // trueCourts là optional
      {
        date: "2023-11-03",
        time: 7,
        conditionCourts: [1],
        trueCourts: [3, 5],
        succeeded: {
          status: false,
          failedCourts: [],
        },
      },
    ],
  },
];
```

Each object contains:

- location: The desire location used as an `id` to uniquely indentify the object.
- bookingRequests: The list of requests to be perform at the desire location.

One request contains:

- `date`: The desire date in `yyyy-mm-dd` format.
- `time`: The desire time from `0-24`.
- `conditionCourts`: The prerequisite list of courts to be booked. If these courts can't be booked the request is treated to be failed and move to the next request.
- `trueCourts`: After booking `conditionCourts` successfully, the list of `trueCourts` will be booked as an addition.
- `succeeded`: Just specify it like the example above it is used for programmatically checking the status of booking.

**NOTICE**

- There is no `id` for the request, so you don't have to care about replication.
- If the `conditionCourts` are booked failed, the `trueCourts` will not be processed.
