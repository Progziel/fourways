const cron = require('node-cron');
const logger = require('./logger');

const getServerTimeZone = () => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (error) {
        logger.error('Error determining server time zone:', error.message);
      return 'UTC'; // Fallback to UTC if there's an error
    }
  };

  const scheduleCronJob = (schedule, task, options = {}) => {
    try {
      // Use the server's local time zone if no timezone is provided
      const timezone = options.timezone || getServerTimeZone();
  
      // Schedule the cron job with the provided schedule and task
      cron.schedule(schedule, async () => {
        try {
          await task();
        } catch (error) {
            logger.error(`Error executing cron job: ${error.message}`);
        }
      }, {
        scheduled: true,
        timezone: timezone,
        ...options
      });
    //   logger.info(`Cron job scheduled with schedule: ${schedule} in timezone: ${timezone}`);
    } catch (error) {
      logger.error(`Error scheduling cron job: ${error.message}`);
    }
  };

module.exports = { scheduleCronJob };

