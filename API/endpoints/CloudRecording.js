/**
 * Category of endpoints for Zoom meetings
 * @author Aryan Pandey
 * @namespace api.cloudRecording
 */

const EndpointCategory = require('../../EndpointCategory');
const ZACCLError = require('../../ZACCLError');
const ERROR_CODES = require('../../ERROR_CODES');
const utils = require('../../EndpointCategory/helpers/utils');

class CloudRecording extends EndpointCategory {
  constructor(config) {
    super(config, CloudRecording);
  }
}

/* -------------------------- Endpoints ------------------------- */

/**
 * Get all recordings of a meeting
 * @author Aryan Pandey
 * @async
 * @instance
 * @memberof api.cloudRecording
 * @method listMeetingRecordings
 * @param {object} options - object containing all arguments
 * @param {string|number} options.meetingId - the Zoom meeting ID or UUID
 * @return {Recording[]} list of Zoom meeting recording objects {@link https://marketplace.zoom.us/docs/api-reference/zoom-api/cloud-recording/recordingget#responses}
 */
CloudRecording.listMeetingRecordings = function (options) {
  // Check if required param is present
  if (!options.meetingId) {
    throw new ZACCLError({
      message: 'Meeting ID is a required parameter',
      code: ERROR_CODES.INVALID_MEETING_ID,
    });
  }

  // Cast meeting ID to a string so we can run string operations
  const meetingIdStr = String(options.meetingId);

  return this.visitEndpoint({
    // Call function on meetingId to handle double encoding if necessary
    path: `/meetings/${utils.doubleEncodeIfNeeded(meetingIdStr)}/recordings`,
    method: 'GET',
    errorMap: {
      400: {
        1010: 'We could not find the user on this account',
      },
      404: {
        1001: 'We could not find that user',
        3301: `There are no recordings for the meeting ${options.meetingId}`,
      },
    },
  });
};
CloudRecording.listMeetingRecordings.action = 'get all recordings of a meeting';
CloudRecording.listMeetingRecordings.requiredParams = ['meetingId'];
CloudRecording.listMeetingRecordings.scopes = [
  'recording:read:admin',
  'recording:read',
];

/**
 * List all cloud recordings of a user
 * @author Aryan Pandey
 * @async
 * @instance
 * @memberof api.cloudRecording
 * @method listUserRecordings
 * @param {object} options - object containing all arguments
 * @param {string} options.userId - the user ID or email address of the user
 * @param {number} [options.pageSize=300] - number of records
 *   returned from a single API call
 * @param {string} [options.nextPageToken] - token used to pageinate
 *   through large result sets
 * @param {string} [options.searchTrashFor] - Indicate type of
 *   cloud recording to retreive from the trash.
 *   options - {'meeting_recordings', 'recording_file'}
 * @param {string|Date} [options.startDate] - string accepted by JS Date
 *   constructor or instance of Date object.
 *   Date needs to be within past 6 months
 * @param {string|Date} [options.endDate] - string accepted by JS Date
 *   constructor or instance of Date object.
 *   Date needs to be within past 6 months
 * @return {Recording[]} List of Zoom Recordings {@link https://marketplace.zoom.us/docs/api-reference/zoom-api/cloud-recording/recordingslist#responses}
 */
CloudRecording.listUserRecordings = function (options) {
  // Destructure arguments
  const {
    userId,
    searchTrashFor,
    nextPageToken,
    startDate,
    endDate,
    pageSize,
  } = options;

  // Declare default start Date to 6 months before
  const defaultDate = new Date();
  defaultDate.setMonth(defaultDate.getMonth() - 6);

  // Initialize params object with default values and only add
  // optional params if they are defined
  const params = {
    page_size: 300,
    trash: !!searchTrashFor,
    from: utils.formatDate(defaultDate, 'startDate'),
  };

  if (pageSize) {
    // Throw error if pageSize is over max val of 300
    if (pageSize >= 300) {
      throw new ZACCLError({
        message: `We requested ${pageSize} recordings from Zoom but it can only give us 300 at a time`,
        code: ERROR_CODES.INVALID_PAGESIZE,
      });
    }
    params.page_size = pageSize;
  }

  if (startDate) {
    params.from = startDate;
  }

  if (endDate) {
    params.to = endDate;
  }

  if (searchTrashFor) {
    if (searchTrashFor !== 'meeting_recordings' || searchTrashFor !== 'recording_file') {
      throw new ZACCLError({
        message: 'We could not search trash for the type of recording you requested',
        code: ERROR_CODES.INVALID_SEARCH_TRASH_FOR,
      });
    }
    params.trash_type = searchTrashFor;
  }

  if (nextPageToken) {
    params.next_page_token = nextPageToken;
  }

  return this.visitEndpoint({
    path: `/users/${userId}/recordings`,
    method: 'GET',
    params,
    postProcessor: (response) => {
      // Extract the recordings from the body
      const newResponse = response;
      newResponse.body = response.body.meetings;
      return newResponse;
    },
    errorMap: {
      404: {
        1001: `We could not find the user ${options.userId} on this account`,
      },
    },
  });
};
CloudRecording.listUserRecordings.action = 'list all cloud recordings of a user';
CloudRecording.listUserRecordings.requiredParams = ['userId'];
CloudRecording.listUserRecordings.paramTypes = {
  pageSize: 'number',
  nextPageToken: 'string',
  searchTrashFor: 'string',
  startDate: 'date',
  endDate: 'date',
};
CloudRecording.listUserRecordings.scopes = [
  'recording:read:admin',
  'recording:read',
];

/*------------------------------------------------------------------------*/
/*                                 Export                                 */
/*------------------------------------------------------------------------*/

module.exports = CloudRecording;
