const https = require('https');
const request = function (option, requestData) {
  return new Promise((res, rev) => {
    let data = '';
    const req = https.request(option, (response) => {
      console.log('statusCode:', response.statusCode);
      response.on('data', (chunk) => {
        data += chunk.toString();
      });
      response.on('end', () => {
        res(JSON.parse(data));
      });
    });
    req.on('error', (e) => {
      console.log(e);
      rev(`problem with request: ${e.message}`);
    });
    requestData && req.write(requestData);
    req.end();
  });
};

const projectName = 'github/Azumaxoid/front-end-5';
const workflowName = 'workflow';
const wfEventName = 'CIWorkflow';
const jobEventName = 'CIJob';
const nrAccount = process.env.NR_ACCOUNT;
const nrKey = process.env.NR_KEY;
const nrInsightIngestKey = process.env.NR_II_KEY;
const gitActionOpt = {
  protocol: 'https:',
  hostname: 'api.github.com',
  path: `/repos/${projectName.replace('github/', '')}/actions/runs`,
  method: 'GET',
  headers: {
      'User-Agent': projectName.replace(/\//g, '-')
  }
};
const nrOpt = {
  protocol: 'https:',
  hostname: 'api.newrelic.com',
  path: `/graphql`,
  method: 'POST',
  headers:{
    'Content-Type': 'application/json',
    'API-Key': nrKey
  }
};
const nrEventOpt = {
  protocol: 'https:',
  hostname: 'insights-collector.newrelic.com',
  path: `/v1/accounts/${nrAccount}/events`,
  method: 'POST',
  headers:{
    'Content-Type': 'application/json',
    'X-Insert-Key': nrInsightIngestKey
  }
};
const nrQuery = { "query":  `{actor{account(id: ${nrAccount}) {nrql(query: "FROM ${wfEventName} SELECT count(*) FACET id SINCE 1 hour ago") {results}}}}`};
let date = new Date();
date.setHours(date.getHours() - 1);
const lastTimestamp = date.getTime();
Promise.all([request(nrOpt, JSON.stringify(nrQuery)), request(gitActionOpt)]).then((datas)=> {
  // datas[0] is newrelic result
  const existedIds = datas[0].data.actor.account.nrql.results.map(res => res.facet);
  // datas[1] is circleci result
  const workflows = datas[1].workflow_runs.filter(item => existedIds.indexOf(item.id) < 0).map(item => ({
    eventType: wfEventName,
    ci: 'GithubActions',
    projectName,
    workflowName,
    id: item.id,
    duration: new Date(item.updated_at).getTime() - new Date(item.run_started_at).getTime(),
    status: item.status,
    timestamp: new Date(item.run_started_at).getTime(),
    end: new Date(item.updated_at).getTime(),
    branch: item.head_branch
  })).filter(workflow => workflow.timestamp > lastTimestamp);
  Promise.all(workflows.map(workflow => request({
    protocol: 'https:',
    hostname: 'api.github.com',
    path: `/repos/${projectName.replace('github/', '')}/actions/runs/${workflow.id}/jobs`,
    method: 'GET',
    headers: {
        'User-Agent': projectName.replace(/\//g, '-')
    }
  }))).then(workflowJobs => {
    const jobs = workflowJobs.filter(jobs => jobs.items && jobs.items.length > 0).reduce((res, jobs, idx) =>
        [...res, ...jobs.items, ...jobs.items.map(job => ({
          eventType: jobEventName,
          ci: 'GithubActions',
          projectName,
          workflowName,
          id: job.id,
          workflowId: workflows[idx].id,
          timestamp: !!job.started_at ? new Date(job.started_at).getTime() : workflows[idx].end,
          end: !!job.completed_at ? new Date(job.completed_at).getTime() : workflows[idx].end,
          duration: (!!job.completed_at ? new Date(job.completed_at).getTime() : workflows[idx].end) - (!!job.started_at ? new Date(job.started_at).getTime() : workflows[idx].end),
          name: job.name,
          status: job.status
        }))
        ], []);
    return request(nrEventOpt, JSON.stringify([...workflows, ...jobs]));
  });
});
