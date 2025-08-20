const mongoose = require("mongoose");

const QuerySchema = new mongoose.Schema(
  {
    text: { type: String, required: true, unique: true },
    embedding: { type: [Number], index: false },
    answer: { type: String },

    scope: {
      type: String,
      enum: ["public", "instructor", "admin"],
      default: "public"
    },

    metadata: {
      sourceType: {
        type: String,
        enum: ["course", "section", "subsection", "review", "category", "faq"],
        required: true
      },
      sourceId: { type: String, required: true },
      courseId: { type: String },
      courseName: { type: String },
      sectionId: { type: String },
      subSectionId: { type: String },
      categoryId: { type: String },
      userId: { type: String },
      rating: { type: Number },
      tags: { type: [String], default: [] },
      price: { type: Number },
      status: { type: String },
      sourceHash: { type: String },
      version: { type: Number, default: 1 }
    }
  },
  { timestamps: true }
);

QuerySchema.index({ "metadata.sourceType": 1, "metadata.courseId": 1 });
QuerySchema.index({ "metadata.sourceType": 1, "metadata.categoryId": 1 });

module.exports = mongoose.model("Query", QuerySchema);
