let data = {};
let prob_data = {};

loadData()
  .then(() => {
    const pointsInInterval = 5;

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

    //Max > 30
    Highcharts.chart("container_d", {
      chart: {
        type: "spline",
      },
      title: {
        text: "Probability of min temp.",
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
        enabled: true,
      },
      series: [
        {
          data: prob_data.prob.min_10,
          name: "Min < 10",
          dataLabels: {
            enabled: true,
            format: "{y:.1f}",
          },
        },
        {
          data: prob_data.prob.min_0,
          name: "Min < 0",
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

    //Max > 20 & Max > 30
    Highcharts.chart("container_m", {
      chart: {
        type: "spline",
      },
      title: {
        text: "Probability of max temp.",
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
        enabled: true,
      },
      series: [
        {
          data: prob_data.prob.max_20,
          name: "Max > 20",
          color: "orange",
          dataLabels: {
            enabled: true,
            format: "{y:.1f}",
          },
        },
        {
          data: prob_data.prob.max_30,
          name: "Max > 30",
          color: "red",
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
        text: "Gaussian temperatures",
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
      const response = await fetch(resources.path + "alldailytempdata.json");
      data = await response.json();

      if (data) {
        //////////////////Confidence Charts///////////////////////
        //This year data
        const selected_year = new Date().getFullYear();
        const current_year = data.avgTemp.filter(
          (r) => new Date(r[0]).getFullYear() == selected_year
        );

        const current_year_temp = [];
        const temp = {};

        current_year.map((cy) => {
          if (temp?.[new Date(cy[0]).getMonth()] == undefined) {
            temp[new Date(cy[0]).getMonth()] = [];
          }
          temp[new Date(cy[0]).getMonth()].push(cy[1]);
        });

        Object.keys(temp).map((t) => {
          current_year_temp.push(
            temp[t].reduce((sum, value) => sum + value, 0) / temp[t].length
          );
        });

        //Past years data
        const dailyTemp = data.avgTemp.filter(
          (r) =>
            new Date(r[0]).getFullYear() != resources.start_year - 1 &&
            new Date(r[0]).getFullYear() != new Date().getFullYear()
        );

        const temp_month = {};

        dailyTemp.map((dr) => {
          if (temp_month?.[new Date(dr[0]).getMonth()] == undefined) {
            temp_month[new Date(dr[0]).getMonth()] = {};
          }

          if (
            temp_month[new Date(dr[0]).getMonth()]?.[
              new Date(dr[0]).getFullYear()
            ] == undefined
          ) {
            temp_month[new Date(dr[0]).getMonth()][
              new Date(dr[0]).getFullYear()
            ] = [];
          }

          temp_month[new Date(dr[0]).getMonth()][
            new Date(dr[0]).getFullYear()
          ].push(dr[1]);
        });

        const hold = {};

        Object.keys(temp_month).map((key) => {
          hold[key] = {};
          for (const year in temp_month[key]) {
            hold[key][year] =
              temp_month[key][year].reduce((sum, value) => sum + value, 0) /
              temp_month[key][year].length;
          }
        });

        const hold1 = {};

        for (const month in hold) {
          hold1[month] = [];
          for (const year in hold[month]) {
            hold1[month].push(hold[month][year]);
          }
        }

        const temp_month_ds = [];

        Object.keys(hold1).map((key) => {
          const mean_sd = calculate(hold1[key]);
          if (hold1?.[key] != undefined) {
            temp_month_ds.push({
              mean: mean_sd.mean,
              sd: mean_sd.sd,
              rain_ty: current_year_temp[key],
            });
          } else {
            temp_month_ds.push({ mean: mean_sd.mean, sd: mean_sd.sd });
          }
        });

        /////////////////////////////////////////////////////////////////

        const tempMean = data.avgTemp
          .filter(
            (avg) =>
              new Date(avg[0]).getFullYear() != resources.start_year - 1 &&
              new Date(avg[0]).getFullYear() != new Date().getFullYear()
          )
          .reverse();

        const temp_year = {};

        tempMean.map((avg) => {
          const date_y = new Date(avg[0]).getFullYear();

          if (temp_year?.[date_y] == undefined) {
            temp_year[date_y] = {
              temp_avg: [],
            };
          }
          temp_year[date_y].temp_avg.push(avg[1]);
        });

        const final_temp_year = [];
        Object.keys(temp_year).map((k) => {
          const sum = temp_year[k].temp_avg.reduce(
            (partialSum, a) => partialSum + a,
            0
          );
          final_temp_year.push(sum / temp_year[k].temp_avg.length);
        });

        const tempMax = data.maxTemp.filter(
          (avg) =>
            new Date(avg[0]).getFullYear() != resources.start_year - 1 &&
            new Date(avg[0]).getFullYear() != new Date().getFullYear()
        );

        const tempMin = data.minTemp.filter(
          (avg) =>
            new Date(avg[0]).getFullYear() != resources.start_year - 1 &&
            new Date(avg[0]).getFullYear() != new Date().getFullYear()
        );

        const temp_prob_m = {};

        tempMin.map((tm) => {
          const date_m = new Date(tm[0]).toLocaleString("en-US", {
            month: "short",
          });

          if (temp_prob_m?.[date_m] == undefined) {
            temp_prob_m[date_m] = {
              min_10: 0,
              min_0: 0,
              days_counter: 0,
            };
          }

          if (tm[1] < 0) {
            temp_prob_m[date_m].min_0++;
          }
          if (tm[1] < 10) {
            temp_prob_m[date_m].min_10++;
          }

          temp_prob_m[date_m].days_counter++;
        });

        tempMax.map((tm) => {
          const date_m = new Date(tm[0]).toLocaleString("en-US", {
            month: "short",
          });

          if (temp_prob_m[date_m]?.max_20 == undefined) {
            temp_prob_m[date_m].max_20 = 0;
            temp_prob_m[date_m].max_30 = 0;
          }

          if (tm[1] > 30) {
            temp_prob_m[date_m].max_30++;
          }
          if (tm[1] > 20) {
            temp_prob_m[date_m].max_20++;
          }
        });

        const temp_final = {
          min_0: [],
          min_10: [],
          max_20: [],
          max_30: [],
        };

        Object.keys(temp_prob_m).map((k) => {
          if (temp_prob_m[k].days_counter) {
            temp_final.min_0.push([
              k,
              (temp_prob_m[k].min_0 / temp_prob_m[k].days_counter) * 100,
            ]);
            temp_final.min_10.push([
              k,
              (temp_prob_m[k].min_10 / temp_prob_m[k].days_counter) * 100,
            ]);
            temp_final.max_20.push([
              k,
              (temp_prob_m[k].max_20 / temp_prob_m[k].days_counter) * 100,
            ]);
            temp_final.max_30.push([
              k,
              (temp_prob_m[k].max_30 / temp_prob_m[k].days_counter) * 100,
            ]);
          }
        });

        prob_data = {
          prob: temp_final,
          year: final_temp_year,
          ds: temp_month_ds,
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
    //////////////////Confidence Charts///////////////////////
    //This year data
    const selected_year = year ?? new Date().getFullYear();
    const current_year = data.avgTemp.filter(
      (r) => new Date(r[0]).getFullYear() == selected_year
    );

    const current_year_temp = [];
    const temp = {};

    current_year.map((cy) => {
      if (temp?.[new Date(cy[0]).getMonth()] == undefined) {
        temp[new Date(cy[0]).getMonth()] = [];
      }
      temp[new Date(cy[0]).getMonth()].push(cy[1]);
    });

    Object.keys(temp).map((t) => {
      current_year_temp.push(
        temp[t].reduce((sum, value) => sum + value, 0) / temp[t].length
      );
    });

    //Past years data
    const dailyTemp = data.avgTemp.filter(
      (r) =>
        new Date(r[0]).getFullYear() != resources.start_year - 1 &&
        new Date(r[0]).getFullYear() != new Date().getFullYear()
    );

    const temp_month = {};

    dailyTemp.map((dr) => {
      if (temp_month?.[new Date(dr[0]).getMonth()] == undefined) {
        temp_month[new Date(dr[0]).getMonth()] = {};
      }

      if (
        temp_month[new Date(dr[0]).getMonth()]?.[
          new Date(dr[0]).getFullYear()
        ] == undefined
      ) {
        temp_month[new Date(dr[0]).getMonth()][new Date(dr[0]).getFullYear()] =
          [];
      }

      temp_month[new Date(dr[0]).getMonth()][
        new Date(dr[0]).getFullYear()
      ].push(dr[1]);
    });

    const hold = {};

    Object.keys(temp_month).map((key) => {
      hold[key] = {};
      for (const year in temp_month[key]) {
        hold[key][year] =
          temp_month[key][year].reduce((sum, value) => sum + value, 0) /
          temp_month[key][year].length;
      }
    });

    const hold1 = {};

    for (const month in hold) {
      hold1[month] = [];
      for (const year in hold[month]) {
        hold1[month].push(hold[month][year]);
      }
    }

    const temp_month_ds = [];

    Object.keys(hold1).map((key) => {
      const mean_sd = calculate(hold1[key]);
      if (hold1?.[key] != undefined) {
        temp_month_ds.push({
          mean: mean_sd.mean,
          sd: mean_sd.sd,
          rain_ty: current_year_temp[key],
        });
      } else {
        temp_month_ds.push({ mean: mean_sd.mean, sd: mean_sd.sd });
      }
    });

    prob_data.ds = temp_month_ds;

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
      text: "Temp. confidence intervals",
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
          text: "Temperature [°C]",
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
        name: `Temperature (${selected_year})`,
        color: "orange",
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
