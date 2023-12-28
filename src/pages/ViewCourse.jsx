import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { Outlet, useParams } from "react-router-dom"
import {FiChevronsRight} from 'react-icons/fi'

import CourseReviewModal from "../components/core/ViewCourse/CourseReviewModal"
import VideoDetailsSidebar from "../components/core/ViewCourse/VideoDetailsSidebar"
import { getFullDetailsOfCourse } from "../services/operations/courseDetailsAPI"
import {
  setCompletedLectures,
  setCourseSectionData,
  setEntireCourseData,
  setTotalNoOfLectures,
} from "../slices/viewCourseSlice"

export default function ViewCourse() {
  const { courseId } = useParams()
  const { token } = useSelector((state) => state.auth)
  const dispatch = useDispatch()
  const [reviewModal, setReviewModal] = useState(false)
  const [hideMenu, setHideMenu] = useState(false);

  useEffect(() => {
    ; (async () => {
      const courseData = await getFullDetailsOfCourse(courseId, token)
      // console.log("Course Data here... ", courseData.courseDetails)
      dispatch(setCourseSectionData(courseData.courseDetails.courseContent))
      dispatch(setEntireCourseData(courseData.courseDetails))
      dispatch(setCompletedLectures(courseData.completedVideos))
      let lectures = 0
      courseData?.courseDetails?.courseContent?.forEach((sec) => {
        lectures += sec.subSection.length
      })
      dispatch(setTotalNoOfLectures(lectures))
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggle = () => {
    setHideMenu(!hideMenu);
  }


  return (
    <>
      <div className="relative flex min-h-[calc(100vh-3.5rem)]">
        <div className="absolute left-[1rem] top-[0.1rem] text-richblack-5 text-2xl">
          <button onClick={toggle}><FiChevronsRight /></button>
        </div>
       {  hideMenu &&
         <VideoDetailsSidebar toggle={toggle} setReviewModal={setReviewModal} />
       }
        <div className="h-[calc(100vh-3.5rem)] flex-1 overflow-auto py-4">
          <div className="m-6">
            <Outlet />
          </div>
        </div>

      </div>
      {reviewModal && <CourseReviewModal setReviewModal={setReviewModal} />}
    </>
  )
}
