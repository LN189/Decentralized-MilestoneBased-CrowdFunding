var CrowdFunding = artifacts.require("./CrowdFunding.sol");
// var Project = artifacts.require("Project")

module.exports = function(deployer) {
  deployer.deploy(CrowdFunding);
  // deployer.deploy(Project,"0xab49D236B6473FF833c34e5C04326E5673aA4A78", "Tit1", "Des1", 1, 3);
};
