import Cookies from "js-cookie";

export function saveToken(token) {
  // expires in 7 days
  Cookies.set("token", token, { expires: 7 });
}

export function removeToken() {
  Cookies.remove("token");
}

export function getToken() {
  return Cookies.get("token");
}
