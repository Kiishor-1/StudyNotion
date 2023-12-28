import toast from "react-hot-toast";
import { apiConnector } from "../apiConnector";
import { contactusEndpoint } from "../apis";
export const contactUs = async (data) => {
    const toastId = toast.loading("Sending...")
    let result = null;
    try {
        const response = await apiConnector("POST", contactusEndpoint.CONTACT_US_API,{data});
        // console.log("contact responsse....",response);
        if (!response?.data?.success) {
            throw new Error("Unable To Contact")
        }
        toast.success("Email Sent")
        result = response?.data?.data;
    } catch (error) {
        console.log("GET_ALL_COURSE_API API ERROR............", error)
        toast.error(error.message)
    }
    toast.dismiss(toastId)
    return result
}