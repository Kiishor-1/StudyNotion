import { useState, useRef, useEffect } from "react"
import { AiOutlineDown } from "react-icons/ai"

function FaqAccordion({ faq, isActive, handleActive, idx }) {
    const contentEl = useRef(null)
    const [sectionHeight, setSectionHeight] = useState(0)

    useEffect(() => {
        setSectionHeight(isActive ? contentEl.current.scrollHeight : 0)
    }, [isActive])

    return (
        <div className="overflow-hidden border border-solid border-richblack-600 bg-richblack-700 text-richblack-5 rounded-lg">
            <div
                className="flex cursor-pointer items-center justify-between px-5 py-4"
                onClick={() => handleActive(idx)}
            >
                <div className="flex items-center gap-2">
                    <i className={isActive ? "rotate-180 transition" : "rotate-0 transition"}>
                        <AiOutlineDown />
                    </i>
                    <p className="font-medium text-sm">{faq.question}</p>
                </div>
            </div>
            <div
                ref={contentEl}
                className="overflow-hidden transition-[height] duration-300 ease bg-richblack-900"
                style={{ height: sectionHeight }}
            >
                <div className="px-6 py-4 text-sm text-richblack-200">
                    {faq.answer}
                </div>
            </div>
        </div>
    )
}

export default function SupportFaqs({ faqs }) {
    const [activeIndex, setActiveIndex] = useState(null)

    const handleActive = (idx) => {
        setActiveIndex(activeIndex === idx ? null : idx)
    }

    return (
        <div className="space-y-3 w-full overflow-auto">
            {faqs.map((faq, idx) => (
                <FaqAccordion
                    key={idx}
                    faq={faq}
                    idx={idx}
                    isActive={activeIndex === idx}
                    handleActive={handleActive}
                />
            ))}
        </div>
    )
}
