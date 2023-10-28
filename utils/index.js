import {
  bookCourtByCourtNumAndId,
  cancelBookedCourt,
  getBookedCourts,
  getCourtIds,
} from "../requests/index.js";
import { ErrorCode } from "../constants/errorCode/index.js";

export const retrieveCourtIdBasedOnCourtNum = async (
  courtNum,
  matchedRequest
) => {
  const rawCourtIds = await getCourtIds(matchedRequest.id);

  const regex = new RegExp(`&court=${courtNum}`, "g");
  const searchPoint = rawCourtIds.search(regex);
  const rawIdLength = 9;
  const courtIdRaw = rawCourtIds.slice(searchPoint - rawIdLength, searchPoint);
  const courtId = searchPoint === -1 ? -1 : courtIdRaw.substring(3);

  return courtId;
};

export const bookCourtByCourtId = async (
  courtId,
  courtNum,
  { cookie, date, time }
) => {
  if (courtId == -1) {
    console.log(
      `Không book được sân ${courtNum}! ngày ${date} lúc ${time} giờ vì sân đã bị book trước hoặc không tồn tại!`
    );
    return ErrorCode.NO_COURT_ID;
  }

  let data = await bookCourtByCourtNumAndId(courtNum, courtId, cookie);
  // console.log(37, data);
  const regex = RegExp(ErrorCode.SUCCESS, "g");
  if (regex.test(data)) {
    // book success
    console.log(
      `Book sân ${courtNum} ngày ${date} lúc ${time} giờ thành công!`
    );
    return ErrorCode.SUCCESS;
  } else {
    // book failed
    const regexExpired = RegExp(ErrorCode.EXPIRED_CREDENTIAL, "g");
    if (regexExpired.test(data)) {
      console.log(
        `Book không được sân ${courtNum}! ngày ${date} lúc ${time} giờ vì cookie không hợp lệ hoặc hết hạn!`
      );
      return ErrorCode.EXPIRED_CREDENTIAL;
    }

    const regexFailed = RegExp(ErrorCode.FAILED, "g");
    if (regexFailed.test(data)) {
      console.log(
        `Book không được sân ${courtNum}! ngày ${date} lúc ${time} giờ vì sân đã bị reserved!`
      );
      return ErrorCode.FAILED;
    }

    const regexExceeded = RegExp(ErrorCode.MAX_EXCEEDED, "g");
    if (regexExceeded.test(data)) {
      console.log(
        `Book không được sân ${courtNum}! ngày ${date} lúc ${time} giờ vì đã đạt giới hạn số lượng sân được đặt!`
      );
      return ErrorCode.MAX_EXCEEDED;
    }
  }

  console.log("Book không được sân không rõ nguyên do!");
  return false;
};

export const bookCourt = async (
  matchedRequest,
  courtNum,
  date,
  time,
  cookie
) => {
  const courtId = await retrieveCourtIdBasedOnCourtNum(
    courtNum,
    matchedRequest
  );
  // tìm thấy courtId thì tiến hành book
  const bookingStatus = await bookCourtByCourtId(courtId, courtNum, {
    cookie,
    date,
    time,
  });

  return bookingStatus;
};

const formatFetchedBookedList = (bookedList) => {
  let formattedBookedList = [];
  const bookedInfo = {};
  let newBookedList = bookedList.toLowerCase();

  let targetStr = newBookedList.slice(newBookedList.search("time:"));

  let day, month, year;
  let isNaNValue = false;
  if (isNaN(parseInt(targetStr.substring(11)))) {
    isNaNValue = true;
    day = targetStr.substring(10, 11);
    bookedInfo.date = `${year}-${month}-${day}`;
  } else {
    isNaNValue = false;
    day = targetStr.substring(10, 12);
  }

  if (isNaNValue) {
    if (isNaN(parseInt(targetStr.substring(13)))) {
      month = targetStr.substring(12, 13);
    } else {
      month = targetStr.substring(12, 14);
    }
  } else {
    if (isNaN(parseInt(targetStr.substring(14)))) {
      month = targetStr.substring(13, 14);
    } else {
      month = targetStr.substring(13, 15);
    }
  }
  year = new Date().getFullYear().toString();
  bookedInfo.date = `${year}-${month.length > 1 ? month : "0" + month}-${
    day.length > 1 ? day : "0" + day
  }`;
  const time = targetStr.substring(17, 19);
  bookedInfo.time = parseInt(time);
  targetStr = targetStr.slice(targetStr.search("location:"));
  const limitPos = targetStr.search("</div>");
  const locationStr = targetStr.substring(10, limitPos);
  bookedInfo.location = locationStr.split("/")[0];
  bookedInfo.court = parseInt(
    locationStr.split("/")[locationStr.split("/").length - 1].slice(6)
  );
  targetStr = targetStr.slice(targetStr.search("id="));
  bookedInfo.id = targetStr.substring(3, 9);
  formattedBookedList.push(bookedInfo);

  while (targetStr.search("time:") !== -1) {
    const bookedInfo = {};
    targetStr = targetStr.slice(targetStr.search("time:"));

    let day, month, year;
    let isNaNValue = false;
    if (isNaN(parseInt(targetStr.substring(11)))) {
      isNaNValue = true;
      day = targetStr.substring(10, 11);
      bookedInfo.date = `${year}-${month}-${day}`;
    } else {
      isNaNValue = false;
      day = targetStr.substring(10, 12);
    }

    if (isNaNValue) {
      if (isNaN(parseInt(targetStr.substring(13)))) {
        month = targetStr.substring(12, 13);
      } else {
        month = targetStr.substring(12, 14);
      }
    } else {
      if (isNaN(parseInt(targetStr.substring(14)))) {
        month = targetStr.substring(13, 14);
      } else {
        month = targetStr.substring(13, 15);
      }
    }
    year = new Date().getFullYear().toString();
    bookedInfo.date = `${year}-${month.length > 1 ? month : "0" + month}-${
      day.length > 1 ? day : "0" + day
    }`;
    const time = targetStr.substring(17, 19);
    bookedInfo.time = parseInt(time);
    targetStr = targetStr.slice(targetStr.search("location:"));
    const limitPos = targetStr.search("</div>");
    const locationStr = targetStr.substring(10, limitPos);
    bookedInfo.location = locationStr.split("/")[0];
    bookedInfo.court = parseInt(
      locationStr.split("/")[locationStr.split("/").length - 1].slice(6)
    );
    targetStr = targetStr.slice(targetStr.search("id="));
    bookedInfo.id = targetStr.substring(3, 9);
    formattedBookedList.push(bookedInfo);
  }
  return formattedBookedList;
};

export const getBookedIdBasedOnLocationDateCourtNum = (
  fetchedBookedList,
  location,
  date,
  time,
  court
) => {
  const formattedBookedList = formatFetchedBookedList(fetchedBookedList);
  const target = formattedBookedList.find(
    (item) =>
      item.location === location &&
      item.date === date &&
      item.time === time &&
      item.court === court
  );

  if (target) {
    return target.id;
  } else {
    return -1;
  }
};

export const cancelBookedCourtById = async (
  cookie,
  location,
  date,
  time,
  court
) => {
  const bookedList = await getBookedCourts(cookie);
  console.log(bookedList);

  const bookedId = getBookedIdBasedOnLocationDateCourtNum(
    bookedList,
    location,
    date,
    time,
    court
  );

  if (bookedId === -1) {
    console.log(
      `Không hủy được sân ${court} ngày ${location} lúc ${time} giờ vì sân không tồn tại.`
    );
    return ErrorCode.NO_COURT_ID;
  }

  const cancelCourt = await cancelBookedCourt(cookie, bookedId);
  await getBookedCourts(cookie);
  if (cancelCourt === null) {
    console.log(219, "Lỗi trong quá trình gửi cancel request");
    return ErrorCode.UNKNOWN_ERROR;
  } else {
    const regexExpired = RegExp(ErrorCode.EXPIRED_CREDENTIAL, "g");
    if (regexExpired.test(cancelCourt)) {
      console.log(
        `Không hủy được sân ${court} ngày ${date} lúc ${time} giờ tại ${location} vì cookie sai hoặc đã hết hạn.`
      );
      return ErrorCode.EXPIRED_CREDENTIAL;
    }

    const regexFailed = RegExp(ErrorCode.CANCEL_FAILED, "g");
    if (regexFailed.test(cancelCourt)) {
      console.log(
        `Không hủy được sân ${court} ngày ${date} lúc ${time} giờ tại ${location} vì sân không tồn tại.`
      );
      return ErrorCode.CANCEL_FAILED;
    }

    const regexSuccess = RegExp(ErrorCode.CANCEL_SUCCESS, "g");
    if (regexSuccess.test(cancelCourt)) {
      console.log(
        `Hủy sân ${court} ngày ${date} lúc ${time} giờ tại ${location} thành công.`
      );
      return ErrorCode.CANCEL_SUCCESS;
    }
  }

  console.log(269, "Lỗi không xác định");
  return ErrorCode.UNKNOWN_ERROR;
};

export const delay = (delayInms) => {
  return new Promise((resolve) => setTimeout(resolve, delayInms));
};

// const a = async (cookie, limit) => {
//   let i = 0;
//   while (i < limit) {
//     i++;
//     const b = await bookCourt(
//       { id: 835445, date: "2023-11-03", time: 7, location: "hervanta" },
//       1,
//       "2023-11-03",
//       7,
//       cookie
//     );
//     // await getBookedCourts(cookie);

//     if (b === ErrorCode.SUCCESS) {
//       console.log("thành công");
//     } else {
//       console.log("thất bại");
//     }

//     await delay(5000);

//     const c = await cancelBookedCourtById(
//       cookie,
//       "hervanta",
//       "2023-11-03",
//       7,
//       1
//     );
//     if (c === ErrorCode.CANCEL_SUCCESS) {
//       console.log("cancel thanh cong");
//     } else {
//       console.log("cancel that bai");
//     }
//   }
// };

// a(
//   "_ga=GA1.1.490669924.1693473359; _ga_XWBJWEFREF=GS1.1.1698136196.7.1.1698136973.0.0.0; lb_selection=1541596802.47873.0000; _ga_500BRKCGK8=GS1.1.1698427515.56.0.1698427515.0.0.0; _shibsession_77656270616765732e74756e692e666968747470733a2f2f776562686f74656c342e74756e692e66692f73686962626f6c657468=_e6a27141d4f569d18b90028f60dde497",
//   5
// );
