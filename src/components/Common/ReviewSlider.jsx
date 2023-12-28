import React, { useEffect } from 'react'
import { useState } from 'react'
import { Swiper, SwiperSlide } from "swiper/react"
import "swiper/css"
import "swiper/css/free-mode"
import "swiper/css/pagination"
import { Autoplay, Navigation } from 'swiper'
import ReviewCard from './ReviewCard';
import toast from 'react-hot-toast';
import { fetchAllReviews } from '../../services/operations/reviewsAPI';

export default function ReviewSlider() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const getAllReviews = async () => {
      const response = await fetchAllReviews()
      // console.log("review data......", response);
      if (response?.data?.success) {
        setReviews(response.data.data);
      }
    }
    getAllReviews();
  }, []);



  return (
    <div className='w-full'>
      <div className="w-11/12 max-w-maxContent mx-auto flex-col items-center justify-between gap-8 first-letter bg-richblack-900 text-white">
        <h1 className="text-center text-4xl font-semibold mt-8">
          Reviews from other learners
        </h1>
        <div className="my-20">
          {
            reviews?.length ? (
              <Swiper loop={true}
                // spaceBetween={100}
                pagination={true}
                modules={[Autoplay, Navigation]}
                className="mySwiper"
                autoplay={{
                  delay: 1000,
                  disableOnInteraction: false,
                }}
                navigation={true}
                breakpoints={{
                  1024: {
                    slidesPerView: 4,
                    spaceBetween: 30
                  },
                  992: {
                    slidesPerView: 2,
                    spaceBetween: 40
                  },
                  768: {
                    slidesPerView: 1,
                    spaceBetween: 20
                  },
                }}>
                {
                  reviews.map((item, idx) => (
                    <div className="" key={idx}>
                      <SwiperSlide>
                        <ReviewCard item={item} />
                      </SwiperSlide>
                    </div>
                  ))
                }

              </Swiper>
            ) : (
              <p className='w-full text-center py-16 my-8 text-richblack-5 text-3xl border border-richblack-400 '>No Reviews Yet</p>
            )
          }
        </div>
      </div>
    </div>
  )
}
