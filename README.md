This repository contains the source code for a serverless Travis CI-to-Slack bot. It is based on an [Medium article](https://medium.com/openwhisk/a-serverless-composition-of-functions-59b6743d3835) that I published to describe the application.

# The application scenario
The bot reacts to [Travis CI build notifications](https://docs.travis-ci.com/user/notifications) and performs the following tasks:
* retrieves the pull request and build details,
* fetches and analyzes the build and test logs,
* generates Slack notifications for the failed tests aimed at contributors.

In the case of a build failure, the GitHub contributor receives a summary of the failing tests as a result of their pull request, along with links to access the complete Travis CI logs. The bot may be configured to also generate a notification for successful builds, which is useful to nudge committers to review a pull request.

<table>
  <tr>
    <td>
      <img src="https://cdn-images-1.medium.com/max/1600/1*OjXi3N2w3yZwLpOEh-37uw.png" width="40%" title="sample notification">
    </td>
  </tr>
  <tr>
    <td>
      Figure 1: Example Slack notifications for Pull Requests submitted to Apache OpenWhisk and tested with Travis CI. The message provides links to the pull request, the build logs, and the test logs.
    </td>
  </tr>
</table>

# The architecture
The application control and data flow are illustrated in the figure below and consists of the following logical steps, each of which is a serverless function.

<table>
  <tr>
    <td>
      <img src="https://cdn-images-1.medium.com/max/1600/1*USRAWjoF6VtvUWgFZRuIbw.png" width="80%" title="architecture">
    </td>
  </tr>
  <tr>
    <td>
      Figure 2: The steps that make up the application.
    </td>
  </tr>
</table>

* [`extract`](https://github.com/rabbah/travis-to-slack/blob/master/extract-build-info.js#L49-L56): The build notification contains several properties to extract, including the repository, pull request number, author name, and build details.
* [`fetch job id`](https://github.com/rabbah/travis-to-slack/blob/master/fetch-job-id.js): queries Travis CI to determine the job id. This id determines the location of the build logs.
* [`verify log url`](https://github.com/rabbah/travis-to-slack/blob/master/verify-log-url.js): determines the location for the Travis CI logs from the job id. Travis may store the logs internally or archive them on Amazon’s S3. There is a short window where neither location is valid. This action determines which location to use and fails if there are no logs yet (in which case, the function should be retried).
* [`analyze log`](https://github.com/rabbah/travis-to-slack/blob/master/analyze-log.py#L33): fetches the logs from the given URL and analyzes them for test failures.
* [`format message`](https://github.com/rabbah/travis-to-slack/blob/master/format-for-slack.js): this action combines the results of the log analysis with the build information extracted earlier to generate the contents of the notification message.
* [`post notification`](https://github.com/apache/incubator-openwhisk-catalog/blob/master/packages/slack/post.js): sends the Slack message to the intended recipient. This action requires a Slack bot token.

# The composition

The functions are deployed as [OpenWhisk actions](https://github.com/apache/incubator-openwhisk/blob/master/docs/actions.md) and comprise the building blocks from which the application’s control and dataflow are orchestracted to realize the architecture show in the figure above. The easiest way to do this is using a function _combinator_ library called `composer` available [as an npm package](https://www.npmjs.com/package/@ibm-functions/composer). It permits a hierarchical composition of functions and provides the mechanisms to introduce out-of-band dataflows necessary in my scenario.

Here is the Travis CI to Slack notifier using `composer`. It makes it easy to write code that matches the intended architecture.

<table>
  <tr>
    <td>
      <img src="https://cdn-images-1.medium.com/max/1600/1*wVsn6V7r-aNkVpYOZUaZuw.png" width="60%" title="composer">
    </td>
  </tr>
  <tr>
    <td>
      Figure 3: The application composition logic, authored using the Cloud Shell. Composer is a Node.js library. You can reference serverless functions by name, or write inline JavaScript functions.
    </td>
  </tr>
</table>

The top level combinator (line 7) is a `sequence`. It chains functions together so that the result of one function is the input to the next. The composition can refer to functions by name (e.g., `extract`) or inline JavaScript functions (lines 14 and 18).

The `retain` combinator (line 10) is an example of program state that is automatically saved and restored around functions or other combinators. In this case, the extracted build metadata which is the result of the computation after `fetch job id` is saved automatically on a stack, and restored later after the log analysis completes. In this way, data is _persisted_ and forwarded around other functions.

The `retry` combinator is needed around the `verify log url` action since it might require one or more tries to determine the location of the logs to analyze.

The `retain` on line 16 permits the injection of a Slack token into the formatted notification message. This eschews the need to create a Slack package binding while still using the OpenWhisk package catalog of handy functions. This is an example of a 3rd party function that I didn’t have to write and instead just pulled from a public functions catalog.

The action `format message` must perform a mapping from the GitHub user id to the contributor’s corresponding Slack id. This function currently assumes the existence of a fixed mapping of names to ids. This is not strictly necessary as the Travis build notification includes the author’s email address. So it is plausible to generate an email notification if no Slack id is found. This could be done using a `try-catch` or `if-then-else` combinator for example, and left as an exercise for the interested reader (I will accept pull requests that improve and enhance the composition).

# Deploying your own
A [script](https://github.com/rabbah/travis-to-slack/blob/master/do.sh) is provided to deploy the actions and the composition. Once deployed the OpenWhisk CLI or API may be used to invoke the latter as any other action. In fact, you can externalize the application as a [web action](https://medium.com/openwhisk/web-actions-serverless-web-apps-with-openwhisk-f21db459f9ba) and use the resultant API endpoint in the Travis configuration to generate the webhook (see Apache OpenWhisk for [an example](https://github.com/apache/incubator-openwhisk/blob/master/.travis.yml#L38-L41)).
# Setup and testing

You need a Slack token to deploy and run the application. You also need to configure Travis CI to generate the webhook.
The deployment scripts assumes the presence of the `wsk` CLI and either `fsh` or `composer` in your path.

  1. `export SLACK_TOKEN="..."`
  2. Create `author-map.json` containing your name and Slack userID (see `author-map-template.json`).
  2. `./do.sh --deploy`
  3. `./do.sh --test`   # make sure you're the author of the mock PR (use your "name", not Slack handle as in `author-map.json`).
  4. Confirm you received the Slack notification.
  5. `./do.sh --teardown` to delete all the artifacts.

To configure the Travis CI webhook, you need the URL for the web action deployed by script which will look like the following:
```html
https://openwhisk/api/v1/web/guest/travis2slack/receive.webhook.json
```

To test via curl:
```bash
curl -k https://openwhisk/api/v1/web/guest/travis2slack/receive.webhook.json -X POST -H "Content-Type: application/json" -d @sample-formdata.json
```

To configure your repository with the Travis CI webhook, you should encrypt the URL for the webaction and add it to your repository `.travis.yml` file. Here's a sample command.
```bash
travis encrypt --org -r your/repo "https://openwhisk/api/v1/web/guest/travis2slack/receive.webhook.json"
```
