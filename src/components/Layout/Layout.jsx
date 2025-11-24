import './Layout.css';

const Layout = ({ leftPanel, middlePanel, rightPanel }) => {
  return (
    <div className="layout">
      <div className="layout-panel layout-left">
        {leftPanel}
      </div>
      <div className="layout-panel layout-middle">
        {middlePanel}
      </div>
      <div className="layout-panel layout-right">
        {rightPanel}
      </div>
    </div>
  );
};

export default Layout;

