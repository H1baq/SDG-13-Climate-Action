// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {ERC1155Holder} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title  CarbonCredit
 * @notice SDG 13 (Climate Action): tokenized carbon credits for Kenyan climate projects.
 *
 *         1 token = 1 tonne of CO2 equivalent (tCO2e).
 *         Each project gets its own token ID (ERC-1155), so credits from the same
 *         project are interchangeable, but credits from different projects are not.
 *
 *  Lifecycle:
 *    1. registerProject  - a project DEVELOPER registers a project and its community wallet
 *    2. verifyAndIssue   - an independent VERIFIER approves the project and mints credits
 *    3. listForSale      - the developer puts credits up for sale (held in escrow by this contract)
 *    4. buyCredits       - a buyer pays; the payment is split automatically between the
 *                          developer and the local community (benefit-sharing)
 *    5. retireCredits    - the owner retires credits to offset emissions; tokens are BURNED,
 *                          so the same tonne can never be sold or claimed again (no double-counting)
 */
contract CarbonCredit is ERC1155, ERC1155Holder, AccessControl, ReentrancyGuard {
    bytes32 public constant DEVELOPER_ROLE = keccak256("DEVELOPER_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    /// @dev Basis points: 10_000 = 100%. Kenyan law requires a minimum community share;
    ///      the admin sets the minimum the platform enforces.
    uint16 public constant MAX_BPS = 10_000;
    uint16 public minCommunityShareBps;

    struct Project {
        uint256 id;
        string name;
        string location;
        string projectType;     // e.g. "Clean Cookstoves", "Reforestation"
        string metadataURI;     // project documents (e.g. IPFS link to design doc + audit report)
        address developer;
        address communityWallet;
        uint16 communityShareBps;
        bool verified;
        address verifier;
        uint256 totalIssued;
        uint256 totalRetired;
        uint256 listedAmount;   // credits currently held in escrow for sale
        uint256 pricePerTonne;  // in wei
    }

    struct Retirement {
        uint256 projectId;
        address retiredBy;
        uint256 amount;
        string beneficiary;     // who the offset is claimed for, e.g. "Acme Ltd 2026 emissions"
        uint256 timestamp;
    }

    uint256 public projectCount;
    mapping(uint256 => Project) private _projects;
    Retirement[] private _retirements;

    event ProjectRegistered(uint256 indexed projectId, address indexed developer, string name);
    event CreditsIssued(uint256 indexed projectId, address indexed verifier, uint256 amount);
    event CreditsListed(uint256 indexed projectId, uint256 amount, uint256 pricePerTonne);
    event CreditsSold(
        uint256 indexed projectId,
        address indexed buyer,
        uint256 amount,
        uint256 developerPaid,
        uint256 communityPaid
    );
    event CreditsRetired(
        uint256 indexed retirementId,
        uint256 indexed projectId,
        address indexed retiredBy,
        uint256 amount,
        string beneficiary
    );

    error ProjectNotFound();
    error NotProjectDeveloper();
    error AlreadyVerified();
    error NotVerified();
    error InvalidAmount();
    error InvalidAddress();
    error ShareOutOfRange();
    error NotEnoughListed();
    error WrongPayment();
    error SelfVerification();
    error TransferFailed();

    constructor(uint16 _minCommunityShareBps) ERC1155("") {
        if (_minCommunityShareBps > MAX_BPS) revert ShareOutOfRange();
        minCommunityShareBps = _minCommunityShareBps;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // ---------------------------------------------------------------------
    // 1. Register
    // ---------------------------------------------------------------------

    function registerProject(
        string calldata name,
        string calldata location,
        string calldata projectType,
        string calldata metadataURI,
        address communityWallet,
        uint16 communityShareBps
    ) external onlyRole(DEVELOPER_ROLE) returns (uint256 projectId) {
        if (communityWallet == address(0)) revert InvalidAddress();
        if (communityShareBps < minCommunityShareBps || communityShareBps > MAX_BPS) {
            revert ShareOutOfRange();
        }

        projectId = ++projectCount;
        Project storage p = _projects[projectId];
        p.id = projectId;
        p.name = name;
        p.location = location;
        p.projectType = projectType;
        p.metadataURI = metadataURI;
        p.developer = msg.sender;
        p.communityWallet = communityWallet;
        p.communityShareBps = communityShareBps;

        emit ProjectRegistered(projectId, msg.sender, name);
    }

    // ---------------------------------------------------------------------
    // 2. Verify & issue
    // ---------------------------------------------------------------------

    /// @notice Verifier confirms the project's emission reductions and mints credits to the developer.
    /// @dev    Issuance happens once per project so a verified batch can't be inflated later.
    function verifyAndIssue(uint256 projectId, uint256 tonnes) external onlyRole(VERIFIER_ROLE) {
        Project storage p = _getProject(projectId);
        if (p.verified) revert AlreadyVerified();
        if (tonnes == 0) revert InvalidAmount();
        if (p.developer == msg.sender) revert SelfVerification();

        p.verified = true;
        p.verifier = msg.sender;
        p.totalIssued = tonnes;

        _mint(p.developer, projectId, tonnes, "");
        emit CreditsIssued(projectId, msg.sender, tonnes);
    }

    // ---------------------------------------------------------------------
    // 3. List for sale
    // ---------------------------------------------------------------------

    /// @notice Developer moves credits into escrow and sets the price per tonne.
    ///         Calling again adds more credits and updates the price.
    function listForSale(uint256 projectId, uint256 tonnes, uint256 pricePerTonne) external {
        Project storage p = _getProject(projectId);
        if (msg.sender != p.developer) revert NotProjectDeveloper();
        if (!p.verified) revert NotVerified();
        if (tonnes == 0 || pricePerTonne == 0) revert InvalidAmount();

        _safeTransferFrom(msg.sender, address(this), projectId, tonnes, "");
        p.listedAmount += tonnes;
        p.pricePerTonne = pricePerTonne;

        emit CreditsListed(projectId, tonnes, pricePerTonne);
    }

    // ---------------------------------------------------------------------
    // 4. Buy (with automatic community benefit-sharing)
    // ---------------------------------------------------------------------

    function buyCredits(uint256 projectId, uint256 tonnes) external payable nonReentrant {
        Project storage p = _getProject(projectId);
        if (tonnes == 0) revert InvalidAmount();
        if (tonnes > p.listedAmount) revert NotEnoughListed();
        uint256 cost = tonnes * p.pricePerTonne;
        if (msg.value != cost) revert WrongPayment();

        p.listedAmount -= tonnes;

        uint256 communityPaid = (cost * p.communityShareBps) / MAX_BPS;
        uint256 developerPaid = cost - communityPaid;

        _safeTransferFrom(address(this), msg.sender, projectId, tonnes, "");
        _pay(p.communityWallet, communityPaid);
        _pay(p.developer, developerPaid);

        emit CreditsSold(projectId, msg.sender, tonnes, developerPaid, communityPaid);
    }

    // ---------------------------------------------------------------------
    // 5. Retire (burn) - prevents double-counting
    // ---------------------------------------------------------------------

    function retireCredits(uint256 projectId, uint256 tonnes, string calldata beneficiary)
        external
        returns (uint256 retirementId)
    {
        Project storage p = _getProject(projectId);
        if (tonnes == 0) revert InvalidAmount();

        // Reverts if the caller does not hold enough credits.
        _burn(msg.sender, projectId, tonnes);
        p.totalRetired += tonnes;

        retirementId = _retirements.length;
        _retirements.push(Retirement(projectId, msg.sender, tonnes, beneficiary, block.timestamp));

        emit CreditsRetired(retirementId, projectId, msg.sender, tonnes, beneficiary);
    }

    // ---------------------------------------------------------------------
    // Views (public transparency)
    // ---------------------------------------------------------------------

    function getProject(uint256 projectId) external view returns (Project memory) {
        return _getProject(projectId);
    }

    function getAllProjects() external view returns (Project[] memory list) {
        list = new Project[](projectCount);
        for (uint256 i = 0; i < projectCount; i++) {
            list[i] = _projects[i + 1];
        }
    }

    function retirementCount() external view returns (uint256) {
        return _retirements.length;
    }

    function getRetirement(uint256 retirementId) external view returns (Retirement memory) {
        return _retirements[retirementId];
    }

    function getAllRetirements() external view returns (Retirement[] memory) {
        return _retirements;
    }

    /// @notice Per-token metadata link (ERC-1155 standard).
    function uri(uint256 projectId) public view override returns (string memory) {
        return _getProject(projectId).metadataURI;
    }

    // ---------------------------------------------------------------------
    // Admin
    // ---------------------------------------------------------------------

    function setMinCommunityShareBps(uint16 bps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (bps > MAX_BPS) revert ShareOutOfRange();
        minCommunityShareBps = bps;
    }

    // ---------------------------------------------------------------------
    // Internal
    // ---------------------------------------------------------------------

    function _getProject(uint256 projectId) internal view returns (Project storage p) {
        p = _projects[projectId];
        if (p.id == 0) revert ProjectNotFound();
    }

    function _pay(address to, uint256 amount) internal {
        if (amount == 0) return;
        (bool ok, ) = payable(to).call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, ERC1155Holder, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
