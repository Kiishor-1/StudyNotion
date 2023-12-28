import ReactStars from 'react-stars'
export default function ReviewCard({ item }) {
    return (
        <div className='flex flex-col gap-y-4 bg-richblack-800 text-richblack-5 p-4 max-w-[400px] mx-auto'>
            <div className="flex items-center gap-x-4">
                <img src={item.user.image ? item.user.image :`https://api.dicebear.com/5.x/initials/svg?seed=${item.user.firstName}%20${item.user.lastName}`} className='w-[40px] h-[40px] rounded-full' alt="" />
                <div className="flex flex-col">
                    <h2 className='text-[13px]'>{item.user.firstName} {item.user.lastName}</h2>
                    <p className='text-xs text-richblack-400'>{item?.course?.courseName}</p>
                </div>
            </div>
            <p className="">{item.review}</p>
            <div className="flex items-center gap-x-3 text-[14px]">
                <p className="">{item.rating}</p>
                <ReactStars
                    count={5}
                    // onChange={ratingChanged}
                    value={item.rating}
                    edit={false}
                    size={20}
                    color2={'#ffd700'} />
            </div>
        </div>
    )
}
