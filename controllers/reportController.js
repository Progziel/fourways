const DriverReport = require('../models/DriverReport');

exports.createReport = async (req, res) => {
 
    try {
      const imageUrl = req.file.path;
      const {
        driverId,
        reportDate,
        reportType,
        subCategory,
        location,
        description,
       } = req.body;

      // Parse location if it's sent as a JSON string (common in form-data)
      let parsedLocation = location;
      if (typeof location === 'string') {
        parsedLocation = JSON.parse(location);
      }
  
      const newReport = new DriverReport({
        driverId,
        reportDate,
        reportType,
        subCategory,
        location:parsedLocation,
        description,
        imageUrl,
      });
  
      const savedReport = await newReport.save();
      res.status(201).json({
        success: true,
        message: 'Report created successfully',
        data: savedReport
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Error creating report',
        error: error.message
      });
    }
  };

  exports.deleteReport = async (req, res) => {
    try {
      const report = await DriverReport.findByIdAndDelete(req.params.id);
      if (!report) {
        return res.status(404).json({ message: 'Report not found' });
      }
      res.status(200).json({
        success: true,
        message: 'Report deleted successfully',
        data: report
        });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error deleting report',
        error: error.message
      });
    }
  };

   exports.validateReport = async (req, res) => {
      try {
        const { id } = req.params; 
    
       const updatedReport = await DriverReport.findByIdAndUpdate(
          id,
          { $inc: { validations: 1 } }, 
          { new: true, runValidators: true } 
        );
    
        if (!updatedReport) {
          return res.status(404).json({ success: false, error: "Report not found." });
        }
    
        res.status(200).json({
          success: true,
          message: "Report validated successfully.",
          data: updatedReport,
        });
      } catch (error) {
        res.status(500).json({ success: false,
        message: error.message });
      }
    };

     exports.reportInaccurate = async (req, res) => {
        try {
          const { id } = req.params; 
      
          const updatedReport = await DriverReport.findByIdAndUpdate(
            id,
            { $inc: { inaccuracies: 1 } }, 
            { new: true, runValidators: true }
          );
      
          if (!updatedReport) {
            return res.status(404).json({ success: false, error: "Report not found." });
          }
      
          res.status(200).json({
            success: true,
            message: "Report marked as inaccurate successfully.",
            data: updatedReport,
          });
        } catch (error) {
          res.status(500).json({ success: false, error: error.message });
        }
      };