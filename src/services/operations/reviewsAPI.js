import toast from "react-hot-toast";
const { ratingsEndpoints } = require("../apis");
const { apiConnector } = require("../apiConnector");

// const { REVIEWS_DETAILS_API } = ratingsEndpoints;

export const fetchAllReviews = async () => {
    const toastId = toast.loading("Loading...");
    let result = null;
    try {
        const response = await apiConnector("GET", ratingsEndpoints.REVIEWS_DETAILS_API);
        // console.log("All Reviews...", response);
        if (!response?.data?.success) {
            throw new Error("Could Not Fetch Reviews")
        }
        result = response;
    } catch (error) {
        console.log("Error while fetching reviews", error.response.data.message);
        toast.error(error.response.data.message);
    }
    toast.dismiss(toastId);
    return result;
}