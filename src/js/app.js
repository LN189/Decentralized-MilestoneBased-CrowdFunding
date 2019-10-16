App = {
  web3Provider: null,
  contracts: {},
  account: '0x0',
  ms : 0,
  pc : 0,
  deadlines : {},
  bools : {},

  init: function() {
    return App.initWeb3();
  },

  initWeb3: function() {
    if (typeof web3 !== 'undefined') {
      // If a web3 instance is already provided by Meta Mask.
      ethereum.enable()
      App.web3Provider = web3.currentProvider;
      web3 = new Web3(web3.currentProvider);
    } else {
      // Specify default instance if no web3 instance provided
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
      web3 = new Web3(App.web3Provider);
    }
    return App.initContract();
  },

  initContract: function() {
    $.getJSON("CrowdFunding.json", function(crowd_funding) {
      // Instantiate a new truffle contract from the artifact
      App.contracts.Crowdfunding = TruffleContract(crowd_funding);
      console.log("Crowd con" + App.contracts.Crowdfunding);
      // Connect provider to interact with contract
      App.contracts.Crowdfunding.setProvider(App.web3Provider);

      App.listenForEvents();

      window.setInterval(function(){
        for (var i in App.deadlines){
          const x = i;
          for (var j=0;j<App.deadlines[i].length;j++){
            const k = j;
            if (k==0){
              if (App.bools[x][0] == 0 && (App.deadlines[x][0] < Math.floor(Date.now()/1000))){
                App.contracts.Crowdfunding.deployed().then(function(instance){
                  fundingInstance = instance;
                  console.log("Changing pro_State : " + App.deadlines[x][0] + ", " + Math.floor(Date.now()/1000));
                  return fundingInstance.UpdateProState(x);
                }).then(function(res){
                  App.bools[x][0] = 1;
                })
              }
            }
            else{

              if (App.bools[x][k] == 0 && (App.deadlines[x][k] < Math.floor(Date.now()/1000))){
                App.contracts.Crowdfunding.deployed().then(function(instance){
                  fundingInstance = instance;
                  console.log("Election starting : " + x +" " + k-1 + " "+ App.deadlines[x][k] + ", " + Math.floor(Date.now()/1000));
                  return fundingInstance.StartElection(x, k-1)
                }).then(function(res){
                  console.log("pre_bl " + App.bools[x][k]);
                  App.bools[x][k] = 1;
                  console.log("after_bl " + App.bools[x][k]);
                  App.render();
                })
              }
              else if (App.bools[x][k] == 1 && (App.deadlines[x][k] + 60 < (Math.floor(Date.now()/1000)))){
                App.contracts.Crowdfunding.deployed().then(function(instance){
                  fundingInstance = instance;
                  console.log("Election completed : "+ x + " " + k-1 + App.deadlines[x][k] + ", " + Math.floor(Date.now()/1000));
                  return fundingInstance.ElectionComplete(x, k-1);
                }).then(function(res){
                  App.bools[x][k] = 2;
                  App.render();
                })
              }
              console.log(App.deadlines[x][k] - (Math.floor(Date.now()/1000)))
            }
          }
        }
      }, 15000);

      return App.render();
    });
  },

  render: function() {
    var fundingInstance;
    // var loader = $("#loader");
    // var content = $("#content");
    //
    // loader.show();
    // content.hide();

    // Load account data
    web3.eth.getCoinbase(function(err, account) {
      if (err === null) {
        App.account = account;
        $("#accountAddress").html("Your Account: " + account);
      }
    });

    // Load contract data
    App.contracts.Crowdfunding.deployed().then(function(instance) {
      fundingInstance = instance;
      return fundingInstance.projectcount();
    }).then(function(pro_count){
        var projectContainer = $("#pro_list");
        projectContainer.empty();
        App.deadlines = {};
        App.bools = {};
        li = [];
        li1 = [];
        for (var i=1;i<=pro_count;i++){
          const x = i;
          fundingInstance.projects(i).then(function(project){
            var pro_title = project[5];
            var pro_description = project[6];
            var pro_curb = web3.fromWei(project[3], 'ether');
            console.log("rpo curb : " + pro_curb);
            var pro_goal = web3.fromWei(project[1], 'ether');
            var pro_dur = project[4]/1000;
            var pro_left = pro_dur - (Math.floor(Date.now()/1000));
            console.log("pro_dur : " + pro_dur);
            console.log("now : " + (Math.floor(Date.now()/1000)));
            // console.log("pro_state : " + project[10]);
            var pro_state = project[10];
            li1.push(pro_state);
            li.push(pro_dur);
            if (pro_left < 0){
              pro_left = 0;
            }
            else{
              pro_left = Number.parseFloat(pro_left/86400.0).toPrecision(4);
            }
            const mcount = project[7];
            var wdt = (1.0*pro_curb/pro_goal)*100;
            var project_state = project[10];
            var project_state_words=""
            // console.log(project_state+"ikkada")
            if(project_state == 0){
              project_state_words="Fundraising";
            }
            if(project_state == 1){
              project_state_words="Fundraised";
            }
            if(project_state == 2){
              project_state_words="Success";
            }
            if(project_state == 3){
              project_state_words="Failure";
            }

            // console.log(pro_description+"pro_title")
            var projectTemplate = "<li>\
                                  	<div class=\"w3-card-4\">\
                                        <header class=\"w3-container\">\
                                          <div class=\"d-flex p-3\" style=\"margin:0 0 -30px 0\">\
                                			       <div class=\"p-2 flex-grow-1\"><h1>"+pro_title+"("+project_state_words+")"+"</h1></div>\
                                			       <div class=\"p-2 \">\
                                            	 <h3 style=\"margin:-5px auto;color:blue\">"+pro_left+"</h3>\
                                            	 <h6> Days left</h6>\
                                             </div>\
                                          </div>\
                                        	<hr>\
                                        </header>\
                                        <div class=\"w3-container\">\
                                          <p style=\"margin:0 3%;font-size:150%\">"+pro_description+"</p>\
                                          <hr>\
                                        </div>\
                                        <div class = \"container-fluid\">\
                                          <div class=\"row\">\
                                              <div class=\"col-sm-1 d-block mx-auto\" id = \"CurBalance"+x+"\"style=\"margin:-8px 0 0 0;font-size:20px\"><p style=\"margin:0 0 0 85%\">"+pro_curb+"</p></div>\
                                              <div class=\"col-sm-10\">\
                                                <div class=\"progress mx-auto\" >\
                                                    <div class=\"progress-bar\" style=\"width:"+wdt+"%\">"+wdt+"%</div>\
                                                </div>\
                                              </div>\
                                              <div class=\"col-sm-1\" style=\"margin:-8px 0 0 -10px;font-size:20px\"><p style=\"margin:0 5% 0 0\">"+pro_goal+"</p></div>\
                                          </div>\
                                       </div>\
                                       <br>\
                                       <div class=\"container-fluid\" style=\"margin:-10px 0 0 92%;align:right\">\
                                          <button type=\"button\" class=\"btn btn-primary \"  onclick=\"App.ShowMilestones("+x+")\">Details</button>\
                                       </div>\
                                    <div class=\"w3-container\" id=\"miles"+x+"\" style=\"display:none\">\
                                    <ul class = \"w3-ul\" id=\"mile_list\">";
            if (mcount == 0){
              projectTemplate+="</ul>\
                              <div class=\"d-flex p-3\" style=\"margin:-10px 0 0 0\">\
                          <div class=\"p-2 flex-grow-1\">\
                              <button type=\"button\" class=\"btn btn-primary\">Refund</button>\
                          </div>\
                          <div class=\"p-2\">\
                              <input type=\"number\" id=\"amount"+x+"\" style=\"width:50%\" class=\"form-control\">\
                          </div>\
                          <div class=\"p-2 \">\
                              <button type=\"button\" onClick=\"App.Contribute("+x+")\" class=\"btn btn-primary \">Contribute</button>\
                          </div>\
                        </div>\
                        </div>\
                     </div>\
                   </li>";
              // console.log(projectTemplate);
              projectContainer.append(projectTemplate);
              App.deadlines[x] = li;
              App.bools[x] = li1;
            }

            for(var j=0;j<mcount;j++){
              // console.log(mcount+"mcount");
              const y=j;
              fundingInstance.getmile(x, y).then(function(des){
                // // var des1 = web3.toAscii("");
                // console.log("desc - " + web3.toAscii(des[0]).trim());
                // console.log("per - " + des[1]);
                var md = des[0];
                // console.log("ded " + x + y + " - " + web3.toAscii(md));
                var per = des[1];
                var ded = des[2]/1000;
                var ded_left = ded - Math.floor(Date.now()/1000);
                console.log("ded " + x + y + " - " + ded);
                console.log("time " + Math.floor(Date.now()/1000));
                console.log("dad_left " + ded_left)
                li.push(ded);
                // li1.push(0);
                if (ded_left <= 0){
                  ded_left = 0;
                }
                else{
                  ded_left = Number.parseFloat(ded_left/86400.0).toPrecision(2);
                }
                var val = des[3];
                console.log("val - " + val);
                var prog = "";
                if(val == 0){
                  li1.push(0);
                  prog = "Not yet started";
                }
                if(val == 1){
                  li1.push(1);
                  prog = "In-progress";
                }
                if(val == 2){
                  li1.push(2);
                  prog = "Completed";
                }
                if (val == 3){
                  li1.push(2);
                  prog = "Failed";
                }
                var yesses = des[4];
                var nos = des[5];
                var tos = yesses+nos;
                var y1 = y + 1;
                var milestoneTemplate = "<li>\
                                          <div class = \"border border-dark\" style=\"margin:0 0 10px 0\">\
                                            <header class=\"w3-container\">\
                                              <div class=\"d-flex p-3\" style=\"margin:0 0 -30px 0\">\
                                          			<div class=\"p-2 flex-grow-1\"><h1>Milestone" + y1+"("+per +"%)" + ": " + web3.toAscii(md)+ "</h1></div>\
                                          			<div class=\"p-2 \">\
                                              	   <h3 style=\"margin:-5px auto;color:blue\">"+ded_left+"</h3>\
                                              	    <h6> Days left</h6>\
                                                </div>\
                                  				    </div>\
                                            </header>\
                                            <hr style=\"color:red\">\
                                            <div class=\"d-flex p-3\" style=\"margin:0 0 -30px 0\">\
                                              <div class=\"p-2 flex-grow-1\" style=\"margin:0 0 0 5%\"><h3>Voting: "+prog+"</h3></div>\
                                              <div class=\"p-2 flex-grow-1\" ><h3>Yes:<span id =\""+ x +"ys"+ y +"\">"+yesses+"</span></h3></div>\
                                              <div class=\"p-2 flex-grow-1\" ><h3>No:<span id =\""+ x +"nn"+ y +"\">"+nos+"</span></h3></div>\
                                              <div class=\"p-2 flex-grow-1\">\
                                              <select id ="+ x +"vt"+ y +" class=\"form-control\" style=\"width:40%;margin:-3.5% 0 0 60%\">\
                                                  <option value=\"1\" selected=\"selected\">Yes</option>\
                                                  <option value=\"2\">No</option>\
                                              </select>\
                                              </div>\
                                              <div class=\"p-2 \" style=\"margin:-0.5% 0 0 0\"><button type=\"button\" class=\"btn btn-default\" onClick=\"App.vote("+x + "," +y +")\" style=\"margin:-5px auto;background-color:blue;color:white\">VOTE</button></div>\
                                            </div>\
                                          </div>\
                                        </li>";
                projectTemplate+=milestoneTemplate;
                // console.log(projectTemplate+"template"+y);
                // console.log(pro_title + " pro_title");
                if(y==mcount-1){
                  // console.log("here")
                  projectTemplate+="</ul>\
                                  <div class=\"d-flex p-3\" style=\"margin:-10px 0 0 0\">\
                              <div class=\"p-2 flex-grow-1\">\
                                  <button type=\"button\" onClick=\"App.Refund("+x+")\"class=\"btn btn-primary\">Refund</button>\
                              </div>\
                              <div class=\"p-2\">\
                                  <input type=\"number\" id=\"amount"+x+"\" style=\"width:50%;margin:0 0 0 50%;border-color:black\" class=\"form-control\">\
                              </div>\
                              <div class=\"p-2 \">\
                                  <button type=\"button\" onClick=\"App.Contribute("+x+")\" class=\"btn btn-primary \">Contribute</button>\
                              </div>\
                            </div>\
                            </div>\
                         </div>\
                       </li>";
                  // console.log(projectTemplate);
                  projectContainer.append(projectTemplate);
                  App.deadlines[x] = li;
                  App.bools[x] = li1;
                  return 0;
                }
              }).then(function(res){
                // console.log("huff");
              });
            }
            // console.log(projectTemplate);
            // console.log("title - " + pro_title);

          })
        }
      });
      console.log("dealines - " + JSON.stringify(App.deadlines));
  },
  StartProject: function() {
    var pro_title = $('#pro_title').val();
    var pro_description = $('#pro_description').val();
    var pro_amount = $('#pro_amount').val();
    var pro_amount_amw = web3.toWei(pro_amount, 'ether');
    var pro_duration = $('#pro_duration').val();
    var mc = App.ms;
    var x = Number(0);
    // var li = [];
    // li.push(Math.floor(Date.now()/1000) + (pro_duration)*86400);
    // var li1 = [];
    // li1.push(0);
    for (var i=1;i<=mc;i++){
      x = x + Number($('#mp'+i).val());
      // li.push(Math.floor(Date.now()/1000) + ($('#md'+i).val())*86400);
      // li1.push(0);
    }
    x = Number(100) - Number(x);
    // console.log("arg1 - " + mds);
    // console.log("arg2 - " + pers);
    // console.log("arg1 - " + );
    console.log("prod - " + pro_duration*1000);
    App.contracts.Crowdfunding.deployed().then(function(instance) {
      return instance.AddProject(pro_title,pro_description,(pro_duration*1000),pro_amount_amw, x, mc, { from: App.account });
    }).then(function(result) {
      //Do Nothing
      App.contracts.Crowdfunding.deployed().then(function(instance) {
        fundingInstance = instance;
        return fundingInstance.projectcount();
      }).then(function(res){
        var pro_id = res;
        // App.deadlines[pro_id] = li;
        // App.bools[pro_id] = li1;
        var mc = App.ms;
        var mts = [];
        var mds = [];
        var mps = [];
        // console.log("mcccccc - " + mc);
        for (var i=1;i<=mc;i++){
          mts.push($('#mt' + i).val());
          console.log("mts - " + mts);
          mps.push($('#mp' + i).val());
          console.log("mps - " + mps);
          mds.push(($('#md' + i).val())*1000);
          console.log("mds - " + mds);
        }
        // console.log("mds - "+ mds);
        fundingInstance.addMilestones(pro_id,mc,
          mts.map((arg) => web3.toHex(arg)), mps, mds, { from: App.account })
        .then(function(res){
          App.ms = 0;
          App.render();
          // console.log("Coming here");
          var template = $("#myModal");
          template.empty();
          template.append("<div class=\"modal-dialog\">\
                                <div class=\"modal-content\">\
                                  <div class=\"modal-header\">\
                                    <h4 class=\"modal-title\">Project Details</h4>\
                                    <button type=\"button\" class=\"close\" data-dismiss=\"modal\">&times;</button>\
                                  </div>\
                                  <div class=\"modal-body\">\
                                    <div class=\"md-form\" id=\"form-body\">\
                                      <label for=\"pro_title\">Title</label>\
                                      <input type=\"text\" id=\"pro_title\" class=\"form-control\">\
                                            <label for=\"pro_description\">Description</label>\
                                      <textarea type=\"text\" rows = \"5\" id=\"pro_description\" class=\"form-control\"></textarea>\
                                            <label for=\"pro_amount\">Amount Needed</label>\
                                      <input type=\"number\" id=\"pro_amount\" class=\"form-control\">\
                                            <label for=\"pro_duration\">Duration(in days)</label>\
                                      <input type=\"number\" id=\"pro_duration\" class=\"form-control\">\
                                    </div>\
                                  </div>\
                                  <div class=\"modal-footer\">\
                                    <button type=\"button\" class=\"btn btn-default\" data-dismiss=\"modal\">CLOSE</button>\
                                    <button type=\"button\" class=\"btn btn-default\" onclick=\"App.addMileStone()\">Add Milestone</button>\
                                    <button type=\"button\" class=\"btn btn-default\" data-dismiss=\"modal\" onclick=\"App.StartProject()\">SAVE</button>\
                                  </div>\
                                </div>\
                              </div>")
        });
      });
    }).catch(function(err) {
      console.error(err);
    });
  },
  Contribute: function(x){
    var ind = x;
    console.log("ind " + ind);
    var eth = $('#amount' + ind).val();
    var amw = web3.toWei(eth, 'ether')
    console.log("amount " + amw);
    App.contracts.Crowdfunding.deployed().then(function(instance){
      fundingInstance = instance;
      return fundingInstance.contribute(ind, {from : App.account, value : amw});
    }).then(function(res){
        console.log("res " + res);
        fundingInstance.projects(ind).then(function(project){
          var curb = web3.fromWei( project[3], 'ether');
          console.log("worked " + curb);
          $('#CurBalance' + ind).text(curb);
          App.render();
          // element.update(curb);
        })
    })
  },
  addMileStone: function(){
    App.ms = App.ms + 1;
    var contentToAdd = "<hr><label for=\"mt"+App.ms+ "\">Milestone"+App.ms+" Title</label>\
                          <input type=\"text\" id=\"mt"+App.ms+"\" class=\"form-control\">\
                        <label for=\"mp"+App.ms+ "\">Milestone"+App.ms+" Weightage(in %)</label>\
                          <input type=\"number\" min=\"0\" max=\"100\" step=\"0.01\" id=\"mp"+App.ms+"\" class=\"form-control\">\
                          <label for=\"md"+App.ms+ "\">Milestone"+App.ms+" deadline(in days)</label>\
                            <input type=\"number\" min=\"0\" id=\"md"+App.ms+"\" class=\"form-control\">"
    $("#form-body").append(contentToAdd);
  },
  ShowMilestones: function(x){
    var ind = x;
    var x = document.getElementById('miles' + ind);
    if (x.style.display === "none") {
      x.style.display = "block";
    } else {
      x.style.display = "none";
    }
  },
  vote: function(x, y){
    var pro_id = x;
    var mile_id = y;
    console.log('#' + x + 'vt' + y);
    var vot = $('#' + x + 'vt' + y).val();
    // var vot = ele.val();
    console.log("vote " + vot);
    App.contracts.Crowdfunding.deployed().then(function(ins){
      fundingInstance = ins;
      return fundingInstance.Vote(pro_id, mile_id, vot, {from : App.account})
    }).then(function(res){
      var yess = res[0];
      var nos = res[1];
      console.log("yesses - " + yess);
      console.log("nos - " + nos);
      // $('#' + pro_id + 'tt' + mile_id).text(yess+nos);
      // $('#' + pro_id + 'ye' + mile_id).text(yess);
      // $('#' + pro_id + 'nn' + mile_id).text(nos);
      console.log("Voting Succesfull");
      App.render();
    });
  },
  Refund: function(x){
    pro_id = x;
    App.contracts.Crowdfunding.deployed().then(function(ins){
      fundingInstance = ins;
      return fundingInstance.getRefund(x, {from : App.account})
    }).then(function(ret){
      console.log(ret);
      console.log("Refunded Succesfully");
    });
  },
  listenForEvents: function() {
    App.contracts.Crowdfunding.deployed().then(function(instance) {
      instance.ProjectStarted({}, {
        fromBlock: 0,
        toBlock: 'latest'
      }).watch(function(error, event) {
        console.log("event triggered", event)
        // Reload when a new vote is recorded
        // App.render();
      });
    });
  }
};

$(function() {
  $(window).load(function() {
    App.init();
  });
});
