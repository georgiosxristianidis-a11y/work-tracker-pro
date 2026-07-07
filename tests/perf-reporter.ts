import { Reporter, FullConfig, Suite, TestCase, TestResult, FullResult } from '@playwright/test/reporter';

class PerfReporter implements Reporter {
  suiteTimes: Map<string, number> = new Map();

  onBegin(config: FullConfig, suite: Suite) {
    console.log(`\n🚀 Starting performance monitoring for test suites...`);
  }

  onTestEnd(test: TestCase, result: TestResult) {
    // Find the nearest named suite for this test
    let currentSuite = test.parent;
    while (currentSuite && currentSuite.title === '') {
      currentSuite = currentSuite.parent;
    }
    
    if (currentSuite && currentSuite.title) {
      const current = this.suiteTimes.get(currentSuite.title) || 0;
      // Accumulate the duration of all tests within the suite
      this.suiteTimes.set(currentSuite.title, current + result.duration);
    }
  }

  onEnd(result: FullResult) {
    console.log(`\n📊 Performance Report (Suite Execution Times):`);
    console.log(`==============================================`);
    
    // Sort suites by duration descending
    const sortedSuites = Array.from(this.suiteTimes.entries()).sort((a, b) => b[1] - a[1]);
    
    sortedSuites.forEach(([title, duration]) => {
      const timeInSecs = (duration / 1000).toFixed(2);
      console.log(`- ${title}: ${timeInSecs}s`);
    });
    console.log(`==============================================\n`);
  }
}

export default PerfReporter;
