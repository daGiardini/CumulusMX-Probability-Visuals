let data = {};
let prob_data = {};
loadData()
  .then(() => {
    const pointsInInterval = 5;
    const todayDate = `${new Date().getDate()}/${new Date().getMonth() + 1}`;
    let todayProb = 0;
    const select = document.getElementById("year_selector");
    for (
      let index = new Date().getFullYear();
      index >= resources.start_year;
      index--
    ) {
      const option = document.createElement("option");
      option.text = index;
      option.value = index;
      select.appendChild(option);
    }
    if (prob_data?.daily) {
      todayProb = prob_data.daily.find((pbd) => {
        return pbd[0] == todayDate;
      });
    }
    //Daily
    Highcharts.chart("container_d", {
      chart: {
        type: "spline",
      },
      title: {
        text: "Probability of daily rain",
      },
      xAxis: {
        title: {
          text: null,
        },
        type: "category",
      },
      yAxis: {
        title: {
          text: "Probability [%]",
        },
      },
      legend: {
        enabled: false,
      },
      series: [
        {
          data: prob_data.daily,
          showInNavigator: true,
        },
      ],
      responsive: {
        rules: [
          {
            condition: {
              maxWidth: 500,
            },
            chartOptions: {
              legend: {
                layout: "horizontal",
                align: "center",
                verticalAlign: "bottom",
              },
            },
          },
        ],
      },
      caption: {
        text: `<b>
Probability of rain today: ${todayProb[1].toFixed(1)}%</b>`,
        align: "center",
      },
    });
    //Monthly
    Highcharts.chart("container_m", {
      chart: {
        type: "spline",
      },
      title: {
        text: "Probability of monthly rain",
      },
      xAxis: {
        title: {
          text: null,
        },
        type: "category",
      },
      yAxis: {
        title: {
          text: "Probability' [%]",
        },
      },
      legend: {
        enabled: false,
      },
      series: [
        {
          data: prob_data.monthly,
          dataLabels: {
            enabled: true,
            format: "{y:.1f}",
          },
        },
      ],
      responsive: {
        rules: [
          {
            condition: {
              maxWidth: 500,
            },
            chartOptions: {
              legend: {
                layout: "horizontal",
                align: "center",
                verticalAlign: "bottom",
              },
            },
          },
        ],
      },
    });
    //Gaussian
    Highcharts.chart("container_g", {
      chart: {
        margin: [50, 0, 50, 50],
        events: {
          load: function () {
            this.series[0].data.forEach(function (point, i) {
              const labels = [
                "4σ",
                "3σ",
                "2σ",
                "σ",
                "μ",
                "σ",
                "2σ",
                "3σ",
                "4σ",
              ];
              if (i % pointsInInterval === 0) {
                point.update({
                  color: "black",
                  dataLabels: {
                    enabled: true,
                    // eslint-disable-next-line max-len
                    format: labels[Math.floor(i / pointsInInterval)],
                    overflow: "none",
                    crop: false,
                    y: -2,
                    style: {
                      fontSize: "13px",
                    },
                  },
                });
              }
            });
          },
        },
      },
      title: {
        text: "Gaussian rainfall data",
      },
      xAxis: {
        alignTicks: false,
      },
      yAxis: {
        title: { text: null },
      },
      legend: {
        enabled: false,
      },
      series: [
        {
          name: "Bell curve",
          type: "bellcurve",
          pointsInInterval: pointsInInterval,
          intervals: 4,
          baseSeries: 1,
          zIndex: -1,
          marker: {
            enabled: false,
          },
        },
        {
          data: prob_data.year,
          visible: false,
        },
      ],
    });
    //Confidence
    setConfidenceChart();
  })
  .catch((error) => {
    console.log(error);
  });
function loadData() {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await fetch(resources.path + "alldailyraindata.json");
      data = await response.json();
      if (data) {
        prob_data = {};
        //////////////////////Confidence Chart//////////////////
        //This year data
        const selected_year = new Date().getFullYear();
        const current_year = data.rain.filter(
          (r) => new Date(r[0]).getFullYear() == selected_year
        );
        const current_year_rain = {};
        const temp = {};
        current_year.map((cy) => {
          if (current_year_rain?.[new Date(cy[0]).getMonth()] == undefined) {
            current_year_rain[new Date(cy[0]).getMonth()] = 0;
            temp[new Date(cy[0]).getMonth()] = 0;
            for (
              let index = 0;
              index <= new Date(cy[0]).getMonth() - 1;
              index++
            ) {
              current_year_rain[new Date(cy[0]).getMonth()] += temp[index];
            }
          }
          current_year_rain[new Date(cy[0]).getMonth()] += cy[1];
          temp[new Date(cy[0]).getMonth()] += cy[1];
        });
        //Past years data
        const dailyRain = data.rain.filter(
          (r) =>
            new Date(r[0]).getFullYear() != resources.start_year - 1 &&
            new Date(r[0]).getFullYear() != new Date().getFullYear()
        );
        const rain_month = {};
        dailyRain.map((dr) => {
          if (rain_month?.[new Date(dr[0]).getMonth()] == undefined) {
            rain_month[new Date(dr[0]).getMonth()] = {};
          }
          if (
            rain_month[new Date(dr[0]).getMonth()]?.[
              new Date(dr[0]).getFullYear()
            ] == undefined
          ) {
            rain_month[new Date(dr[0]).getMonth()][
              new Date(dr[0]).getFullYear()
            ] = 0;
          }
          rain_month[new Date(dr[0]).getMonth()][
            new Date(dr[0]).getFullYear()
          ] += dr[1];
        });
        const hold = {};
        Object.keys(rain_month).forEach((key, i) => {
          hold[key] = [];
          for (const year in rain_month[key]) {
            let sum = rain_month[key][year];
            for (let index = i - 1; index >= 0; index--) {
              sum += rain_month[index][year];
            }
            hold[key].push(sum);
          }
        });
        const rain_month_ds = [];
        Object.keys(hold).map((key) => {
          const mean_sd = calculate(hold[key]);
          if (current_year_rain?.[key] != undefined) {
            rain_month_ds.push({
              mean: mean_sd.mean,
              sd: mean_sd.sd,
              rain_ty: current_year_rain[key],
            });
          } else {
            rain_month_ds.push({ mean: mean_sd.mean, sd: mean_sd.sd });
          }
        });
        ///////////////////Others////////////////////////////////
        const rainDay = data.rain.reverse();
        const rain_prob_d = {};
        const rain_prob_m = {};
        const rain_year = {};
        rainDay.map((rd) => {
          const date_d = `${new Date(rd[0]).getDate()}/${
            new Date(rd[0]).getMonth() + 1
          }`;
          const date_m = new Date(rd[0]).toLocaleString("en-US", {
            month: "short",
          });
          const date_y = new Date(rd[0]).getFullYear();
          //initializiation
          if (rain_prob_d?.[date_d] == undefined) {
            rain_prob_d[date_d] = {
              rain_counter: 0,
              days_counter: 0,
            };
          }
          if (rain_prob_m?.[date_m] == undefined) {
            rain_prob_m[date_m] = {
              rain_counter: 0,
              days_counter: 0,
            };
          }
          if (rain_year?.[date_y] == undefined) {
            rain_year[date_y] = {
              rain_counter: 0,
            };
          }
          //assing values
          rain_year[date_y].rain_counter += rd[1];
          if (rd[1] >= 1) {
            rain_prob_m[date_m].rain_counter++;
            rain_prob_d[date_d].rain_counter++;
          }
          rain_prob_m[date_m].days_counter++;
          rain_prob_d[date_d].days_counter++;
        });
        const years = Object.keys(rain_year);
        delete rain_year[years[0]];
        delete rain_year[years[years.length - 1]];
        let startDay = new Date(2024, 11, 31).getTime();
        let current_day_d = "";
        let current_day_m = "";
        const final_prob_d = [];
        const final_prob_m = [];
        let final_rain_year = [];
        let last_month_index = "";
        while (startDay >= 1704063600000) {
          current_day_d = `${new Date(startDay).getDate()}/${
            new Date(startDay).getMonth() + 1
          }`;
          current_day_m = new Date(startDay).toLocaleString("en-US", {
            month: "short",
          });
          final_prob_d.push([
            current_day_d,
            (rain_prob_d[current_day_d].rain_counter /
              rain_prob_d[current_day_d].days_counter) *
              100,
          ]);
          if (current_day_m !== last_month_index) {
            final_prob_m.push([
              current_day_m,
              (rain_prob_m[current_day_m].rain_counter /
                rain_prob_m[current_day_m].days_counter) *
                100,
            ]);
            last_month_index = current_day_m;
          }
          startDay = startDay - 86400000;
        }
        final_rain_year = Object.keys(rain_year).map((ry) => {
          return rain_year[ry].rain_counter;
        });
        prob_data = {
          daily: final_prob_d.reverse(),
          monthly: final_prob_m.reverse(),
          ds: rain_month_ds,
          year: final_rain_year,
        };
        resolve();
      } else {
        prob_data = {};
        reject();
      }
    } catch (error) {
      console.error(error);
      prob_data = {};
      reject();
    }
  });
}
function updateData(year) {
  if (data) {
    //////////////////////Confidence Chart//////////////////
    //This year data
    const selected_year = year ?? new Date().getFullYear();
    const current_year = data.rain.filter(
      (r) => new Date(r[0]).getFullYear() == selected_year
    );
    const current_year_rain = {};
    const temp = {};
    current_year.reverse().map((cy) => {
      if (current_year_rain?.[new Date(cy[0]).getMonth()] == undefined) {
        current_year_rain[new Date(cy[0]).getMonth()] = 0;
        temp[new Date(cy[0]).getMonth()] = 0;
        for (let index = 0; index <= new Date(cy[0]).getMonth() - 1; index++) {
          current_year_rain[new Date(cy[0]).getMonth()] += temp[index];
        }
      }
      current_year_rain[new Date(cy[0]).getMonth()] += cy[1];
      temp[new Date(cy[0]).getMonth()] += cy[1];
    });
    //Past years data
    const dailyRain = data.rain.filter(
      (r) =>
        new Date(r[0]).getFullYear() != resources.start_year - 1 &&
        new Date(r[0]).getFullYear() != new Date().getFullYear()
    );
    const rain_month = {};
    dailyRain.map((dr) => {
      if (rain_month?.[new Date(dr[0]).getMonth()] == undefined) {
        rain_month[new Date(dr[0]).getMonth()] = {};
      }
      if (
        rain_month[new Date(dr[0]).getMonth()]?.[
          new Date(dr[0]).getFullYear()
        ] == undefined
      ) {
        rain_month[new Date(dr[0]).getMonth()][
          new Date(dr[0]).getFullYear()
        ] = 0;
      }
      rain_month[new Date(dr[0]).getMonth()][new Date(dr[0]).getFullYear()] +=
        dr[1];
    });
    const hold = {};
    Object.keys(rain_month).forEach((key, i) => {
      hold[key] = [];
      for (const year in rain_month[key]) {
        let sum = rain_month[key][year];
        for (let index = i - 1; index >= 0; index--) {
          sum += rain_month[index][year];
        }
        hold[key].push(sum);
      }
    });
    const rain_month_ds = [];
    Object.keys(hold).map((key) => {
      const mean_sd = calculate(hold[key]);
      if (current_year_rain?.[key] != undefined) {
        rain_month_ds.push({
          mean: mean_sd.mean,
          sd: mean_sd.sd,
          rain_ty: current_year_rain[key],
        });
      } else {
        rain_month_ds.push({ mean: mean_sd.mean, sd: mean_sd.sd });
      }
    });
    prob_data.ds = rain_month_ds;
    const select = document.getElementById("year_selector");
    setConfidenceChart(select.value);
  }
}
function setConfidenceChart(syear) {
  const selected_year = syear ?? new Date().getFullYear();
  //Confidence
  Highcharts.chart("container_c", {
    chart: {
      renderTo: "container",
      inverted: false,
    },
    title: {
      text: "Rainfall confidence intervals",
    },
    xAxis: {
      categories: Object.keys(prob_data.ds).map((monthNumber) => {
        const date = new Date();
        date.setMonth(monthNumber);
        return date.toLocaleString("en-US", { month: "short" });
      }),
    },
    yAxis: [
      {
        title: {
          text: "Rainfall [mm]",
        },
        gridZIndex: -1,
        plotLines: [{ value: 0, color: "red", width: 1 }],
      },
    ],
    plotOptions: {
      columnrange: {
        grouping: false,
        color: "red",
      },
      scatter: {
        color: "red",
        marker: {
          symbol: "circle",
        },
      },
    },
    tooltip: {
      shared: true,
    },
    legend: {
      enabled: true,
    },
    series: [
      {
        type: "areasplinerange",
        showInLegend: false,
        enableMouseTracking: false,
        data: prob_data.ds.map((d) => [d.mean + d.sd, d.mean - d.sd]),
        color: "#BDC3C7",
        marker: {
          radius: 0,
        },
      },
      {
        type: "spline",
        showInLegend: true,
        enableMouseTracking: true,
        name: `Rainfall (${selected_year})`,
        data: prob_data.ds
          .map((d) => {
            if (d.rain_ty != undefined) {
              return parseFloat(d.rain_ty.toFixed(1));
            }
          })
          .filter((d) => d != undefined),
        marker: {
          radius: 4,
        },
      },
    ],
    responsive: {
      rules: [
        {
          condition: {
            maxWidth: 500,
          },
          chartOptions: {
            legend: {
              layout: "horizontal",
              align: "center",
              verticalAlign: "bottom",
            },
          },
        },
      ],
    },
  });
}
function calculate(arr) {
  const mean = arr.reduce((sum, value) => sum + value, 0) / arr.length;
  const squaredDifferences = arr.map((value) => Math.pow(value - mean, 2));
  const meanSquaredDifferences =
    squaredDifferences.reduce((sum, value) => sum + value, 0) / arr.length;
  const standardDeviation = Math.sqrt(meanSquaredDifferences);
  return { mean: mean, sd: standardDeviation };
}
