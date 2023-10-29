import { ErrorCode } from "./constants/errorCode/index.js";
import { Location } from "./constants/location/index.js";
import { getAvailableShiftsOnDate } from "./requests/index.js";
import { delay, bookCourt, cancelBookedCourtById } from "./utils/index.js";
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: false, args: ['--incognito'] });


async function login() {
  const browser = await puppeteer.launch({ headless: false, args: ['--incognito'] });
  const page = await browser.newPage();
  let cookies;

  try {
    await page.goto('https://www.tuni.fi/sportuni/omasivu/?page=myevents&lang=en');
    await page.type('#username', 'enter username here'); 
    await page.type('#password', 'enter password here'); 
    await page.click('#login-button'); 
    await page.waitForNavigation();
    const mfaElement = await page.$('#mfa-input'); 
    if (mfaElement) {

      const mfaCode = await getUserInput('Enter MFA code: '); 
      await page.type('#mfa-input', mfaCode); 
      await page.click('#mfa-submit-button'); 
      await page.waitForNavigation(); 
    }
    const cookies = await page.cookies();
    console.log(cookies);

  } catch (error) {
    console.error('An error occurred during login:', error);
  } finally {
    await browser.close();
  }
    return cookies;
}

async function getUserInput(prompt) {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    readline.question(prompt, (userInput) => {
      readline.close();
      resolve(userInput);
    });
  });
}



// START USER INPUT
const toBookList = [
  {
    location: Location.HERVANTA,
    bookingRequests: [
      // Manage dựa trên requests nếu book đc conditionCourts thì process trueCourts
      // Nếu conditionCourts không khả thi thì move to new request. Miễn sao chưa đủ 3 courts là đc
      // Maximum court cho 1 request là 3.
      // trueCourts là optional
      {
        date: "2023-10-30",
        time: 10,
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

const generalInfo = {
  maxCourt: 3,
    cookie: " ",
  //   "AMCV_4D6368F454EC41940A4C98A6%40AdobeOrg=-2121179033%7CMCIDTS%7C19556%7CMCMID%7C61111827150459331551836958612359904734%7CMCAAMLH-1690176222%7C3%7CMCAAMB-1690176222%7CRKhpRz8krg2tLO6pguXWp5olkAcUniQYPHaMWWgdJ3xzPWQmdj0y%7CMCOPTOUT-1689578622s%7CNONE%7CMCAID%7CNONE%7CvVersion%7C5.3.0; s_pers=%20v8%3D1689571434154%7C1784179434154%3B%20v8_s%3DFirst%2520Visit%7C1689573234154%3B%20c19%3Dpr%253Apure%2520portal%253Apersons%253Anetwork%7C1689573234156%3B%20v68%3D1689571433288%7C1689573234159%3B; lb_selection=1541596802.47873.0000; _shibsession_77656270616765732e74756e692e666968747470733a2f2f776562686f74656c342e74756e692e66692f73686962626f6c657468=_6250b1cd9d5d902e52745befdf57b920",
  startDate: "2023-10-30", // yyyy-mm-dd
  endDate: "2023-10-30", // yyyy-mm-dd
  sportUniLocation: {
    hervanta: true,
    center: false,
    kauppi: false,
    otherLocations: false,
  },
};
// END USER INPUT

let startBooking = async (
  { cookie, startDate, endDate, sportUniLocation, maxCourt },
  toBookList,
  bookingLimit = 1
) => {
    // Call the login function here
    await login();
  // fetch the calendar to see if there is available courts at that date
  let data = await getAvailableShiftsOnDate(
    startDate,
    endDate,
    sportUniLocation,
    cookie
  );

  // Only start booking when the calendar have date available
  if (data !== null && data !== undefined && data.length > 1) {
    console.log("Danh sách tồn tại.");
    const formattedList = formatFetchedList(data);
    console.log(
      90,
      `Danh sách available vào từ ${generalInfo.startDate} tới ${generalInfo.endDate}`
    );
    console.log(formattedList);
    let bookingStatus;
    let bookingCount = 0;

    do {
      bookingStatus = await handleBookingRequests(
        formattedList,
        toBookList,
        maxCourt,
        cookie
      );
      bookingCount++;
      console.log(`Lượt ${bookingCount}`);
      console.log(JSON.stringify(toBookList));
    } while (!bookingStatus.stop && bookingCount < bookingLimit);
    if (bookingStatus.stop && bookingStatus.bookCount < maxCourt) {
      console.log(
        "Credential hết hạn hoặc đã đạt giới hạn số sân được đặt trong 1 tuần."
      );
    } else if (bookingStatus.stop && bookingStatus.bookCount >= maxCourt) {
      console.log(`Đã đặt đủ số lượng sân yêu cầu (${maxCourt})!`);
    } else {
      if (bookingCount >= bookingLimit) {
        console.log(`Đạt Limit ${bookingCount}/${bookingLimit}.`);
      } else {
        console.log("Dừng không rõ nguyên do.");
      }
    }
  } else {
    console.log("Không tìm thấy danh sách.");
  }
};

const formatFetchedList = (fetchedList) => {
  const filteredList = fetchedList.filter((item) => {
    return item["color"] == "#8724C1";
  });
  return filteredList.map((item) => {
    const date = item["start"].substring(0, 10);
    const time = parseInt(item["start"].substring(11, 13));
    const location = item["title"].substring(10).toLowerCase();
    const id = item["id"];

    return {
      id,
      date,
      time,
      location,
    };
  });
};

const handleBookingRequests = async (
  fetchedList,
  toBookList,
  maxCourt,
  cookie
) => {
  let bookCount = 0;
  let stop = false;
  // tìm toBookList trong fetchedList
  // nếu match thì tiến hành book
  for (let i = 0; i < toBookList.length; i++) {
    const filteredFetchedListBasedOnLocation = fetchedList.filter(
      (item) => item.location === toBookList[i].location
    );
    const bookingRequests = toBookList[i].bookingRequests;

    const bookedRequests = await bookRequests(
      bookingRequests,
      filteredFetchedListBasedOnLocation,
      maxCourt,
      bookCount,
      cookie
    );

    bookCount += bookedRequests.bookCount;

    if (bookedRequests.stop || bookCount >= maxCourt) {
      // max exceeded hoặc credentials sai thì dừng luôn
      return { bookCount, stop: true };
    }
  }
  return { bookCount, stop };
};

const bookRequests = async (
  bookingRequests,
  filteredFetchedListBasedOnLocation,
  maxCourt,
  currentCount,
  cookie
) => {
  let bookCount = currentCount;
  let stop = false;
  for (const request of bookingRequests) {
    // check status của request trước nếu đã true rồi thì skip
    if (request.succeeded.status) continue;

    const matchedRequest = filteredFetchedListBasedOnLocation.find(
      (item) => item.date === request.date && item.time === request.time
    );
    if (matchedRequest !== undefined) {
      // tìm thấy data ứng với request
      // bắt đầu book

      // tìm courtId trong conditionCourts trước
      // Nếu tìm được thì book
      // không thì bỏ
      const conditionCourtsBookingStatus = await handleBookingConditionCourts(
        matchedRequest,
        request,
        cookie
      );
      if (conditionCourtsBookingStatus.status === false) {
        // không book được conditionCourts thì move to next request
        request.succeeded.status = false;
        request.succeeded.failedCourts = [
          ...request.conditionCourts,
          ...request.trueCourts,
        ];

        if (
          conditionCourtsBookingStatus.statusCode ===
            ErrorCode.EXPIRED_CREDENTIAL ||
          conditionCourtsBookingStatus.statusCode === ErrorCode.MAX_EXCEEDED
        ) {
          return { bookCount, stop: true };
        } else {
          continue;
        }
      } else {
        // book được conditionCourts thì trả về số lượng courts
        bookCount += conditionCourtsBookingStatus.bookCount;
        // sau đó status succeeded
        request.succeeded.status = true;

        if (bookCount >= maxCourt) {
          return { bookCount, stop: true };
        }
        // book được tất cả conditionCourts thì book luôn trueCourts nếu tồn tại
        if (request.trueCourts && bookCount < maxCourt) {
          for (const trueCourtNum of request.trueCourts) {
            const trueCourtBookingStatus = await bookCourt(
              matchedRequest,
              trueCourtNum,
              request.date,
              request.time,
              cookie
            );

            if (trueCourtBookingStatus === ErrorCode.SUCCESS) {
              bookCount++;
              if (bookCount >= maxCourt) {
                for (
                  let i = request.trueCourts.indexOf(trueCourtNum) + 1;
                  i < request.trueCourts.length;
                  i++
                ) {
                  if (
                    request.succeeded.failedCourts.find(
                      (court) => court === request.trueCourts[i]
                    ) === undefined
                  )
                    request.succeeded.failedCourts.push(request.trueCourts[i]);
                }

                return { bookCount, stop: true };
              }
            } else {
              // book không được trueCourts thì bỏ vào danh sách failed
              if (
                request.succeeded.failedCourts.find(
                  (court) => court === trueCourtNum
                ) === undefined
              )
                request.succeeded.failedCourts.push(trueCourtNum);
              break;
            }
          }
        }
      }
    } else {
      // không tìm thấy data ứng với request
      console.log(
        `Không tìm thấy sân theo yêu cầu vào ngày ${request.date} lúc ${request.time}`
      );
      request.succeeded.status = false;
      request.succeeded.failedCourts = [
        ...request.conditionCourts,
        ...request?.trueCourts,
      ];
      continue;
    }
  }

  return { bookCount, stop };
};

const handleBookingConditionCourts = async (
  matchedRequest,
  request,
  cookie
) => {
  let bookCount = 0;
  for (let i = 0; i < request.conditionCourts.length; i++) {
    const courtNum = request.conditionCourts[i];
    // tìm thấy courtId thì tiến hành book
    let bookingStatus = await bookCourt(
      matchedRequest,
      courtNum,
      request.date,
      request.time,
      cookie
    );

    if (
      bookingStatus === ErrorCode.EXPIRED_CREDENTIAL ||
      bookingStatus === ErrorCode.MAX_EXCEEDED
    ) {
      if (i > 0) {
        // xoá thằng đã đặt
        await delay(4000);
        for (let j = 0; j < i; j++) {
          const removeCourtNum = request.conditionCourts[j];

          const cancelStatus = await cancelBookedCourtById(
            cookie,
            matchedRequest.location,
            request.date,
            request.time,
            removeCourtNum
          );
          if (cancelStatus === ErrorCode.CANCEL_SUCCESS) bookCount--;
        }
      }
      return { status: false, statusCode: bookingStatus };
    }

    if (i === 0 && bookingStatus !== ErrorCode.SUCCESS) {
      // thử lại 10 lần
      for (let i = 0; i < 10; i++) {
        bookingStatus = await bookCourt(
          matchedRequest,
          courtNum,
          request.date,
          request.time,
          cookie
        );

        if (bookingStatus === ErrorCode.SUCCESS) break;
      }
      if (bookingStatus !== ErrorCode.SUCCESS) {
        return { status: false, statusCode: bookingStatus };
      } else {
        bookCount++;
      }
    } else if (i !== 0 && bookingStatus !== ErrorCode.SUCCESS) {
      // thử lại 20 lần
      for (let i = 0; i < 20; i++) {
        bookingStatus = await bookCourt(
          matchedRequest,
          courtNum,
          request.date,
          request.time,
          cookie
        );

        if (bookingStatus === ErrorCode.SUCCESS) break;
      }
      if (bookingStatus !== ErrorCode.SUCCESS) {
        // hủy những conditionCourts trước
        await delay(4000);
        for (let j = 0; j < i; j++) {
          const removeCourtNum = request.conditionCourts[j];
          const cancelStatus = await cancelBookedCourtById(
            cookie,
            matchedRequest.location,
            request.date,
            request.time,
            removeCourtNum
          );
          if (cancelStatus === ErrorCode.CANCEL_SUCCESS) bookCount--;
        }
        return { status: false, statusCode: bookingStatus };
      } else {
        bookCount++;
      }
    } else {
      bookCount++;
    }
  }

  return { bookCount, status: true, statusCode: ErrorCode.SUCCESS };
};


const cookies = await login();
generalInfo.cookie = cookies;
startBooking(generalInfo, toBookList, 2);
