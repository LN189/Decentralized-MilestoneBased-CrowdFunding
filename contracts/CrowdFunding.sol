
// We will be using Solidity version 0.5.4
pragma solidity ^0.5.4;
pragma experimental ABIEncoderV2;
// Importing OpenZeppelin's SafeMath Implementation
import './SafeMath.sol';


contract CrowdFunding {
    using SafeMath for uint256;

    enum State {
        Fundraising,
        Fundraised,
        Success,
        Failure
    }

    enum Mile_State{
        Under_Progress,
        Voting,
        Success,
        Failure
    }

    struct MileStone{
        bytes32 desc;
        uint per;
        uint deadline;
        Mile_State state;
        uint yesCount;
        uint noCount;
        mapping(address => uint ) voters;
    }

    modifier inMileState(uint pro_id,uint mile_id, Mile_State milestate){
      require(projects[pro_id].milestones[mile_id].state == milestate);
      _;
    }

    struct Project{
        address payable creator;
        uint amountGoal; // required to reach at least this much, else everyone gets refund
        uint completeAt;
        uint256 currentBalance;
        uint raiseBy;
        string title;
        string description;
        uint mcount;
        uint initp;
        uint refp;
        State state; // initialize on create
        mapping (address => uint) contributions;
        mapping(uint => MileStone) milestones;
    }

    mapping(uint => Project) public projects;

    uint public projectcount;

    event FundingReceived(address contributor, uint amount, uint currentTotal);

    event CreatorPaid(address recipient);

    // Modifier to check current state
    modifier inState(uint id, State _state) {
        require(projects[id].state == _state);
        _;
    }

    modifier inmileState(uint id, uint mile_id, Mile_State _state) {
        require(projects[id].milestones[mile_id].state == _state);
        _;
    }

    // Modifier to check if the function caller is the project creator
    modifier isCreator(uint id) {
        require(msg.sender == projects[id].creator);
        _;
    }

    modifier isContributor(uint id) {
        require(projects[id].contributions[msg.sender] > 0);
        _;
    }

    // Event that will be emitted whenever a new project is started
    event ProjectStarted(
        address projectStarter,
        string projectTitle,
        string projectDesc,
        uint256 deadline,
        uint256 goalAmount
    );

    event debugging(
        uint dummy
    );
    /** @dev Function to start a new project.
      * @param title Title of the project to be created
      * @param description Brief description about the project
      * @param durationInDays Project deadline in days
      * @param amountToRaise Project goal in wei
      */

  function AddProject(
          string calldata title,
          string calldata description,
          uint durationInDays,
          uint amountToRaise,
          uint initp,
          uint mile_count
      ) external {
          uint raiseUntil = now.mul(1000);
          raiseUntil = raiseUntil.add(durationInDays.mul(86400));
          projectcount ++;
          // Project newProject = new Project(msg.sender, title, description, raiseUntil, amountToRaise);
          // projects.push(newProject);
          projects[projectcount] = Project(msg.sender, amountToRaise, 0, 0,
          raiseUntil, title, description, mile_count, initp, 100, State.Fundraising);
          emit ProjectStarted(
              msg.sender,
              title,
              description,
              raiseUntil,
              amountToRaise
          );
      }

      function addMilestones(
          uint pro_id,
          uint mile_count,
          bytes32[] calldata Descs,
          uint[] calldata pers,
          uint[] calldata deads
      ) external {
          for(uint i=0;i<mile_count;i++){
              uint temp = now.mul(1000);
              temp = temp.add(deads[i].mul(86400));
              projects[pro_id].milestones[i] = MileStone(Descs[i], pers[i], temp, Mile_State.Under_Progress, 0, 0);
          }
      }

    function UpdateProState(uint pro_id) external inState(pro_id, State.Fundraising){
      if (projects[pro_id].currentBalance < projects[pro_id].amountGoal){
        projects[pro_id].state = State.Failure;
        for (uint i=0;i<projects[pro_id].mcount;i++)
          projects[pro_id].milestones[i].state = Mile_State.Failure;
      }
      else{
        projects[pro_id].state = State.Fundraised;
        payOut(pro_id, projects[pro_id].initp);
      }
    }

    function StartElection(uint pro_id, uint mile_id) external inmileState(pro_id, mile_id, Mile_State.Under_Progress){
      projects[pro_id].milestones[mile_id].state = Mile_State.Voting;
    }

    function ElectionComplete(uint pro_id, uint mile_id) external {
      if (projects[pro_id].milestones[mile_id].yesCount > projects[pro_id].milestones[mile_id].noCount){
        projects[pro_id].milestones[mile_id].state = Mile_State.Success;
        payOut(pro_id, projects[pro_id].milestones[mile_id].per);
        if(mile_id == projects[pro_id].mcount-1)
          projects[pro_id].state = State.Success;
      }
      else{
        projects[pro_id].state = State.Failure;
        for (uint i=mile_id;i<projects[pro_id].mcount;i++)
          projects[pro_id].milestones[i].state = Mile_State.Failure;
      }
    }

    function getmile(uint pro_id, uint mile_id) public view returns(bytes32, uint, uint, uint, uint, uint){
        MileStone storage ms = projects[pro_id].milestones[mile_id];
        uint val;
        if (ms.state == Mile_State.Under_Progress){
          val = 0;
        }
        if (ms.state == Mile_State.Voting){
          val = 1;
        }
        if (ms.state == Mile_State.Success){
          val = 2;
        }
        if (ms.state == Mile_State.Failure){
          val = 3;
        }
        return (ms.desc, ms.per, ms.deadline, val ,ms.yesCount, ms.noCount);
    }

    event votedEvent (
        uint pro_id,
        uint mile_id,
        uint vote_val
    );

    function Vote(uint pro_id, uint mile_id, uint vote_val) inMileState(pro_id,mile_id,Mile_State.Voting) public {
      require(projects[pro_id].contributions[msg.sender] > 0,"Only Contributors of this project can vote");
      if(projects[pro_id].milestones[mile_id].voters[msg.sender] == 0){
        projects[pro_id].milestones[mile_id].voters[msg.sender] = vote_val;
        if(vote_val == 1){
          projects[pro_id].milestones[mile_id].yesCount++;
        }
        else{
          projects[pro_id].milestones[mile_id].noCount++;
        }
      }
      else{
        if(projects[pro_id].milestones[mile_id].voters[msg.sender] != vote_val){
          if(vote_val == 1){
            projects[pro_id].milestones[mile_id].voters[msg.sender] = 1;
            projects[pro_id].milestones[mile_id].yesCount++;
            projects[pro_id].milestones[mile_id].noCount--;
          }
          else{
            projects[pro_id].milestones[mile_id].voters[msg.sender] = 2;
            projects[pro_id].milestones[mile_id].yesCount--;
            projects[pro_id].milestones[mile_id].noCount++;
          }
        }
      }
      emit votedEvent(pro_id,mile_id,vote_val);
      // return (projects[pro_id].milestones[mile_id].yesCount, projects[pro_id].milestones[mile_id].noCount);
    }

    /** @dev Function to get all projects' contract addresses.
      * @return A list of all projects' contract addreses
      */
    // function returnAllProjects() external view returns(Project[] memory){
    //     return projects;
    // }

    function contribute(uint id) external inState(id, State.Fundraising) payable returns(uint) {
        emit debugging(1);
        require(msg.sender != projects[id].creator, "Sender cant be creator");
        projects[id].contributions[msg.sender] = projects[id].contributions[msg.sender].add(msg.value);
        projects[id].currentBalance = projects[id].currentBalance.add(msg.value);
        emit FundingReceived(msg.sender, msg.value, projects[id].currentBalance);
        checkIfFundingComplete(id);
        return id;
    }

    function checkIfFundingComplete(uint id) public {
        if (projects[id].currentBalance >= projects[id].amountGoal) {
            projects[id].state = State.Fundraised;
            payOut(id, projects[id].initp);
        }
        // else if (now > projects[id].raiseBy)  {
        //     projects[id].state = State.Failure;
        // }
        // projects[id].completeAt = now;
    }

    function payOut(uint id, uint perc) internal inState(id, State.Fundraised) returns (bool){
        uint256 totalRaised = (projects[id].currentBalance).mul(perc)/100;
        // projects[id].currentBalance = 0;

        if (projects[id].creator.send(totalRaised)) {
            emit CreatorPaid(projects[id].creator);
            projects[id].refp = projects[id].refp.sub(perc);
            return true;
        } else {
            // projects[id].currentBalance = totalRaised;
            projects[id].state = State.Fundraised;
        }
        return false;
    }

    function getRefund(uint id) public inState(id, State.Failure) returns (bool){
        require(projects[id].contributions[msg.sender] > 0);

        uint amountToRefund = (projects[id].contributions[msg.sender]).mul(projects[id].refp)/100;
        // projects[id].contributions[msg.sender] = 0;

        if (!msg.sender.send(amountToRefund)) {
            // projects[id].contributions[msg.sender] = currentBal;
            return false;
        } else {
            projects[id].currentBalance = projects[id].currentBalance.sub(projects[id].contributions[msg.sender]);
            projects[id].contributions[msg.sender] = 0;
        }
        return true;
    }
}

















// pragma solidity ^0.5.0;
// pragma experimental ABIEncoderV2;
// import "./SafeMath.sol";


// contract Crowdfunding {
//     using SafeMath for uint256;

//     // List of existing projects
//     Project[] private projects;

//     // Event that will be emitted whenever a new project is started
//     event ProjectStarted(
//         address contractAddress,
//         address projectStarter,
//         string projectTitle,
//         string projectDesc,
//         uint256 deadline,
//         uint256 goalAmount
//     );

//     function startProject(
//         string calldata title,
//         string calldata description,
//         uint durationInDays,
//         uint amountToRaise
//     ) external {
//         uint raiseUntil = now.add(durationInDays.mul(1 days));
//         Project newProject = new Project(msg.sender, title, description, raiseUntil, amountToRaise);
//         projects.push(newProject);
//         emit ProjectStarted(
//             address(newProject),
//             msg.sender,
//             title,
//             description,
//             raiseUntil,
//             amountToRaise
//         );
//     }

//     function returnAllProjects() external view returns(Project[] memory){
//         return projects;
//     }
// }

// contract Project{

//     struct Milestone {
//         uint id;
//         string desc;
//         uint perc;
//         uint day;
//     }

//     enum State{
//         Fundraising,
//         Successful,
//         Expired
//     }

//     address payable public Creator;
//     string public Title;
//     string public Desc;
//     uint public Inp;
//     uint public Goal_amount;
//     uint public CurrentBalance;
//     uint public raiseBy;
//     Milestone[] public milestones;
//     State public state = State.Fundraising;
//     mapping (address => uint) public Contributions;

//     event FundingReceived(address contributor, uint amount, uint currentbalance);
//     event CreatorPaid(address recipent);

//     modifier inState(State _state){
//         require(state == _state, "Incorrect state");
//         _;
//     }

//     modifier isCreator(){
//         require(msg.sender == Creator, "Not Creator");
//         _;
//     }

//     constructor(
//         address payable creator,
//         string memory title,
//         string memory description,
//         uint deadline,
//         uint req_amount,
//         uint inp,
//         Milestone[] memory miles
//     ) public {
//         Creator = creator;
//         Title = title;
//         Desc = description;
//         Inp = inp;
//         Goal_amount = req_amount;
//         raiseBy = deadline;
//         milestones = miles;
//         CurrentBalance = 0;
//     }

//     function contribute() external inState(State.Fundraising) payable {
//         require(msg.sender != Creator);
//         Contributions[msg.sender] = Contributions[msg.sender].add(msg.value);
//         CurrentBalance = CurrentBalance.add(msg.value);
//         emit FundingReceived(msg.sender, msg.value, CurrentBalance);
//         checkIfFundingCompleteOrExpired();
//     }


//     function checkIfFundingCompleteOrExpired() public {
//         if (CurrentBalance >= Goal_amount){
//             state = State.Successful;
//             payOut();
//         }
//         else if (now > raiseBy){
//             state = State.Expired;
//         }
//     }

//     function payOut() internal inState(State.Successful) returns (bool){
//         uint256 totalRaised = CurrentBalance;
//         CurrentBalance = 0;
//         if (Creator.transfer(totalRaised)){
//             emit CreatorPaid(Creator);
//             return true;
//         }
//         else{
//             CurrentBalance = totalRaised;
//             state = State.Successful;
//         }
//         return false;
//     }

//     function getRefund() public inState(State.Expired) returns (bool){
//         require(Contributions[msg.sender] > 0, "Sorry you have not contributed for this project");

//         uint refund_amount = Contributions[msg.sender];
//         Contributions[msg.sender] = 0;
//         if (!msg.sender.transfer(refund_amount)){
//             Contributions[msg.sender] = refund_amount;
//             return false;
//         }
//         else{
//             CurrentBalance = CurrentBalance.sub(refund_amount);
//         }
//         return true;
//     }

//     function getDetails() public view returns
//     (
//         address payable creator,
//         string memory title,
//         string memory desc,
//         uint256 deadline,
//         State currentState,
//         uint256 currentAmount,
//         uint256 GoalAmount
//     ){
//         creator = creator;
//         title = Title;
//         desc = Desc;
//         deadline = raiseBy;
//         currentState = state;
//         currentAmount = CurrentBalance;
//         GoalAmount = Goal_amount;
//     }

// }
