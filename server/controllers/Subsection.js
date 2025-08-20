const Section = require("../models/Section")
const SubSection = require("../models/Subsection")
const Course = require("../models/Course")
const { compactJoin } = require("../utils/aiUtils")
const { uploadImageToCloudinary } = require("../utils/imageUploader")
const { upsertChunk, updateChunk, deleteChunk } = require("../utils/query")

// Create a new sub-section for a given section
exports.createSubSection = async (req, res) => {
  try {
    // Extract necessary information from the request body
    const { sectionId, title, description } = req.body
    const video = req.files.video

    // Check if all necessary fields are provided
    if (!sectionId || !title || !description || !video) {
      return res
        .status(404)
        .json({ success: false, message: "All Fields are Required" })
    }


    // Upload the video file to Cloudinary
    const uploadDetails = await uploadImageToCloudinary(
      video,
      process.env.FOLDER_NAME
    )

    // Create subsection
    const subSectionDetails = await SubSection.create({
      title,
      timeDuration: `${uploadDetails.duration}`,
      description,
      videoUrl: uploadDetails.secure_url,
    })

    // Update the corresponding section with the newly created sub-section
    const updatedSection = await Section.findByIdAndUpdate(
      { _id: sectionId },
      { $push: { subSection: subSectionDetails._id } },
      { new: true }
    ).populate("subSection")

    // Fetch course to which this section belongs
    const course = await Course.findOne({ courseContent: sectionId })
    const courseId = course ? String(course._id) : null
    const courseName = course ? course.courseName : null

    // Upsert embedding
    await upsertChunk({
      text: compactJoin([
        `Course: ${courseName}`,
        `Section: ${updatedSection.sectionName}`,
        `Lecture: ${subSectionDetails.title}`,
        `Summary: ${subSectionDetails.description}`,
      ]),
      metadata: {
        sourceType: "subsection",
        sourceId: String(subSectionDetails._id),
        subSectionId: String(subSectionDetails._id),
        subSectionTitle: subSectionDetails.title,
        sectionId: String(updatedSection._id),
        sectionName: updatedSection.sectionName,
        courseId,
        courseName,
      },
    })

    return res.status(200).json({ success: true, data: updatedSection })
  } catch (error) {
    console.error("Error creating new sub-section:", error)
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    })
  }
}

exports.updateSubSection = async (req, res) => {
  try {
    const { sectionId, subSectionId, title, description } = req.body
    const subSection = await SubSection.findById(subSectionId)

    if (!subSection) {
      return res.status(404).json({
        success: false,
        message: "SubSection not found",
      })
    }

    if (title !== undefined) subSection.title = title
    if (description !== undefined) subSection.description = description

    if (req.files && req.files.video !== undefined) {
      const video = req.files.video
      const uploadDetails = await uploadImageToCloudinary(
        video,
        process.env.FOLDER_NAME
      )
      subSection.videoUrl = uploadDetails.secure_url
      subSection.timeDuration = `${uploadDetails.duration}`
    }

    await subSection.save()

    const updatedSection = await Section.findById(sectionId).populate("subSection")
    const course = await Course.findOne({ courseContent: sectionId })
    const courseId = course ? String(course._id) : null
    const courseName = course ? course.courseName : null

    // Update embedding
    await updateChunk({
      text: compactJoin([
        `Course: ${courseName}`,
        `Section: ${updatedSection.sectionName}`,
        `Lecture: ${subSection.title}`,
        `Summary: ${subSection.description}`,
      ]),
      metadata: {
        sourceType: "subsection",
        sourceId: String(subSection._id),
        subSectionId: String(subSection._id),
        subSectionTitle: subSection.title,
        sectionId: String(updatedSection._id),
        sectionName: updatedSection.sectionName,
        courseId,
        courseName,
      },
    })

    return res.json({
      success: true,
      message: "Section updated successfully",
      data: updatedSection,
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({
      success: false,
      message: "An error occurred while updating the section",
    })
  }
}

exports.deleteSubSection = async (req, res) => {
  try {
    const { subSectionId, sectionId } = req.body

    await Section.findByIdAndUpdate(
      { _id: sectionId },
      { $pull: { subSection: subSectionId } }
    )

    const subSection = await SubSection.findByIdAndDelete({ _id: subSectionId })
    if (!subSection) {
      return res
        .status(404)
        .json({ success: false, message: "SubSection not found" })
    }

    const updatedSection = await Section.findById(sectionId).populate("subSection")

    await deleteChunk({
      metadata: {
        sourceType: "subsection",
        sourceId: String(subSectionId),
      }
    })

    return res.json({
      success: true,
      message: "SubSection deleted successfully",
      data: updatedSection,
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({
      success: false,
      message: "An error occurred while deleting the SubSection",
    })
  }
}
