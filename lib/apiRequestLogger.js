const ApiRequestLog = require('../models/ApiRequestLog');
const { connect } = require('./mongodb');

function createRequestId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function truncate(value, maxLength = 300) {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const normalizedValue = value.trim();
  if (!normalizedValue) {
    return null;
  }

  if (normalizedValue.length <= maxLength) {
    return normalizedValue;
  }

  return `${normalizedValue.slice(0, maxLength - 1)}…`;
}

function getHeader(req, name) {
  const value = req?.headers?.[name];
  return Array.isArray(value) ? value[0] : value;
}

function getClientIpAddress(req) {
  const forwardedFor = getHeader(req, 'x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  return req?.socket?.remoteAddress || null;
}

function getRequestPath(req) {
  return req?.url || req?.query?.path || 'unknown';
}

function extractGraphQLDetails(req) {
  const operationName = req?.body?.operationName || null;
  const query = typeof req?.body?.query === 'string' ? req.body.query : '';
  const compactQuery = query.replace(/\s+/g, ' ').trim();
  const match = compactQuery.match(/^(query|mutation|subscription)\s+([A-Za-z0-9_]+)/i);

  return {
    requestCategory: 'graphql',
    requestName: operationName || (match ? match[2] : null),
    graphqlOperationType: match ? match[1].toLowerCase() : null
  };
}

function extractAuthDetails(req) {
  const nextAuthSegments = Array.isArray(req?.query?.nextauth)
    ? req.query.nextauth
    : [];

  return {
    requestCategory: 'auth',
    requestName: nextAuthSegments.join('/') || null,
    authAction: nextAuthSegments[0] || null
  };
}

function extractRequestDetails(req, routeType) {
  if (routeType === 'graphql') {
    return extractGraphQLDetails(req);
  }

  if (routeType === 'auth') {
    return extractAuthDetails(req);
  }

  return {
    requestCategory: routeType,
    requestName: null,
    graphqlOperationType: null,
    authAction: null
  };
}

function setApiRequestLogContext(req, values) {
  if (!req) {
    return;
  }

  req.apiRequestLogContext = {
    ...(req.apiRequestLogContext || {}),
    ...values
  };
}

async function persistLog(entry) {
  const connection = await connect();
  if (!connection) {
    return;
  }

  await ApiRequestLog.create(entry);
}

function withApiRequestLogging(handler, options = {}) {
  const routeType = options.routeType || 'api';

  return async function apiRequestLoggingHandler(req, res) {
    const startedAt = Date.now();
    const requestId = createRequestId();
    let finalized = false;

    setApiRequestLogContext(req, { requestId });

    const finalize = async (error) => {
      if (finalized) {
        return;
      }
      finalized = true;

      const requestDetails = extractRequestDetails(req, routeType);
      const logEntry = {
        requestId,
        method: req?.method || 'UNKNOWN',
        path: getRequestPath(req),
        routeType,
        statusCode: error ? (res?.statusCode >= 400 ? res.statusCode : 500) : (res?.statusCode || 200),
        durationMs: Date.now() - startedAt,
        userId: req?.apiRequestLogContext?.userId || null,
        userEmail: req?.apiRequestLogContext?.userEmail || null,
        userRole: req?.apiRequestLogContext?.userRole || null,
        ipAddress: getClientIpAddress(req),
        userAgent: truncate(getHeader(req, 'user-agent')),
        referer: truncate(getHeader(req, 'referer')),
        requestCategory: req?.apiRequestLogContext?.requestCategory || requestDetails.requestCategory || null,
        requestName: req?.apiRequestLogContext?.requestName || requestDetails.requestName || null,
        graphqlOperationType: req?.apiRequestLogContext?.graphqlOperationType || requestDetails.graphqlOperationType || null,
        authAction: req?.apiRequestLogContext?.authAction || requestDetails.authAction || null,
        outcome: error || (res?.statusCode >= 400) ? 'error' : 'success',
        errorMessage: truncate(error?.message || null)
      };

      console.log('[api]', JSON.stringify(logEntry));

      try {
        await persistLog(logEntry);
      } catch (persistError) {
        console.error('[api] Failed to persist API request log:', persistError.message);
      }
    };

    res.on('finish', () => {
      void finalize(null);
    });

    res.on('close', () => {
      void finalize(null);
    });

    try {
      return await handler(req, res);
    } catch (error) {
      await finalize(error);
      throw error;
    }
  };
}

module.exports = {
  setApiRequestLogContext,
  withApiRequestLogging
};