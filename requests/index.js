import jsdom from "jsdom";

export const getAvailableShiftsOnDate = async (
  startDate,
  endDate,
  sportUniLocation,
  cookie
) => {
  try {
    const url_get = `https://www.tuni.fi/sportuni/kalenteri/?lang=en&embedded=1&type=3&a1=${sportUniLocation.kauppi}&a2=${sportUniLocation.hervanta}&a3=${sportUniLocation.center}&a4=${sportUniLocation.otherLocations}&ajax=1&start=${startDate}&end=${endDate}&_=1647456934063`;
    let data = await fetch(url_get, { headers: { cookie: cookie } });

    data = await data.json();
    return data;
  } catch (error) {
    console.log(error);
    return null;
  }
};

export const getCourtIds = async (shiftId, cookie) => {
  const url_event = `https://www.tuni.fi/sportuni/kalenteri/?showevent=1&lang=en&embedded=1&id=${shiftId}`;
  // Get the available court depending on the shift id
  let data = await fetch(url_event, { headers: { cookie: cookie } });
  data = await data.text();

  return data;
};

export const bookCourtByCourtNumAndId = async (courtNum, courtId, cookie) => {
  const url_book = `https://www.tuni.fi/sportuni/omasivu/?lang=en&action=badminton&id=${courtId}&court=${courtNum}`;

  let data = await fetch(url_book, {
    headers: {
      cookie: cookie,
    },
  });
  data = await data.text();

  return data;
};

export const getBookedCourts = async (cookie) => {
  try {
    const url = "https://www.tuni.fi/sportuni/omasivu/?page=myevents&lang=en";
    let data = await fetch(url, { headers: { cookie } });
    data = await data.text();
    return data;
  } catch (error) {
    console.log(error);
    return null;
  }
};

export const cancelBookedCourt = async (cookie, id) => {
  try {
    const url = `https://www.tuni.fi/sportuni/omasivu/?lang=en&action=cancel&id=${id}`;
    let data = await fetch(url, { headers: { cookie } });
    data = await data.text();
    return data;
  } catch (error) {
    console.log(error);
    return null;
  }
};
