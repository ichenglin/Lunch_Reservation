import LunchReservationPortal from "./interactions/portal";

(async () => {
    const portal = new LunchReservationPortal();
    await portal.login({username: "USERNAME_HERE", password: "PASSWORD_HERE"});
    const portal_dates = await portal.get_dates();
    console.log(await portal.get_choices(portal_dates[portal_dates.length - 1]));
})();