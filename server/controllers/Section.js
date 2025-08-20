const Section = require("../models/Section")
const Course = require("../models/Course")
const SubSection = require("../models/Subsection")
const { upsertChunk, updateChunk, deleteChunk } = require("../utils/query")
const { compactJoin } = require("../utils/aiUtils")
// CREATE a new section
exports.createSection = async (req, res) => {
  try {
    // Extract the required properties from the request body
    const { sectionName, courseId } = req.body

    // Validate the input
    if (!sectionName || !courseId) {
      return res.status(400).json({
        success: false,
        message: "Missing required properties",
      })
    }

    // Create a new section with the given name
    const newSection = await Section.create({ sectionName })

    // Add the new section to the course's content array
    const updatedCourse = await Course.findByIdAndUpdate(
      courseId,
      {
        $push: {
          courseContent: newSection._id,
        },
      },
      { new: true }
    )
      .populate({
        path: "courseContent",
        populate: {
          path: "subSection",
        },
      })
      .exec()

    await upsertChunk({
      text: compactJoin([
        `Course: ${updatedCourse.courseName}`,
        `Section: ${newSection.sectionName}`,
      ]),
      metadata: {
        sourceType: "section",
        sourceId: String(newSection._id),
        sectionId: String(newSection._id),
        sectionName: newSection.sectionName,
        courseId,
        courseName: updatedCourse.courseName,
      },
    });

    // Return the updated course object in the response
    res.status(200).json({
      success: true,
      message: "Section created successfully",
      updatedCourse,
    })
  } catch (error) {
    // Handle errors
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    })
  }
}

// UPDATE a section
exports.updateSection = async (req, res) => {
  try {
    const { sectionName, sectionId, courseId } = req.body
    const section = await Section.findByIdAndUpdate(
      sectionId,
      { sectionName },
      { new: true }
    )
    const course = await Course.findById(courseId)
      .populate({
        path: "courseContent",
        populate: {
          path: "subSection",
        },
      })
      .exec()
    await updateChunk({
      text: compactJoin([
        `Course: ${course.courseName}`,
        `Section: ${section.sectionName}`,
      ]),
      metadata: {
        sourceType: "section",
        sourceId: String(section._id),
        sectionId: String(section._id),
        sectionName: section.sectionName,
        courseId,
        courseName: course.courseName,
      },
    })
    res.status(200).json({
      success: true,
      message: section,
      data: course,
    })
  } catch (error) {
    console.error("Error updating section:", error)
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    })
  }
}

// DELETE a section
exports.deleteSection = async (req, res) => {
  try {
    const { sectionId, courseId } = req.body
    await Course.findByIdAndUpdate(courseId, {
      $pull: {
        courseContent: sectionId,
      },
    })
    const section = await Section.findById(sectionId)

    if (!section) {
      return res.status(404).json({
        success: false,
        message: "Section not found",
      })
    }
    // Delete the associated subsections
    for (const subSectionId of section.subSection) {
      await SubSection.findByIdAndDelete(subSectionId)

      await deleteChunk({
        metadata: {
          sourceType: "subsection",
          sourceId: String(subSectionId),
        }
      })
    }

    await Section.findByIdAndDelete(sectionId)

    // find the updated course and return it
    const course = await Course.findById(courseId)
      .populate({
        path: "courseContent",
        populate: {
          path: "subSection",
        },
      })
      .exec()

    await deleteChunk({
      metadata: {
        sourceType: "section",
        sourceId: String(section._id),
      }
    })

    res.status(200).json({
      success: true,
      message: "Section deleted",
      data: course,
    })
  } catch (error) {
    console.error("Error deleting section:", error)
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    })
  }
}
